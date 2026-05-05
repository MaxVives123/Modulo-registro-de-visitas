jest.mock('../models', () => ({
  Visit: {
    findAll: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  isSuperAdmin: jest.fn(),
}));

const { Visit } = require('../models');
const { isSuperAdmin } = require('../middleware/auth');
const { getRecentVisits } = require('../controllers/dashboardController');

function makeRes() {
  return {
    json: jest.fn(),
  };
}

describe('dashboardController.getRecentVisits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Visit.findAll.mockResolvedValue([]);
  });

  test('por defecto filtra por checked_in para admin de empresa', async () => {
    isSuperAdmin.mockReturnValue(false);

    const req = {
      query: {},
      user: { role: 'admin_empresa', company_id: 7 },
    };
    const res = makeRes();
    const next = jest.fn();

    await getRecentVisits(req, res, next);

    expect(Visit.findAll).toHaveBeenCalledTimes(1);
    const findAllArgs = Visit.findAll.mock.calls[0][0];
    expect(findAllArgs.where).toEqual({ company_id: 7, status: 'checked_in' });
    expect(findAllArgs.attributes).toEqual(
      expect.arrayContaining(['check_in', 'check_out', 'host_name', 'vehicle_plate'])
    );
    expect(findAllArgs.limit).toBe(8);
    expect(res.json).toHaveBeenCalledWith({ visits: [] });
    expect(next).not.toHaveBeenCalled();
  });

  test('con all=true no fuerza status checked_in', async () => {
    isSuperAdmin.mockReturnValue(false);

    const req = {
      query: { all: 'true' },
      user: { role: 'admin_empresa', company_id: 3 },
    };
    const res = makeRes();
    const next = jest.fn();

    await getRecentVisits(req, res, next);

    const findAllArgs = Visit.findAll.mock.calls[0][0];
    expect(findAllArgs.where).toEqual({ company_id: 3 });
    expect(res.json).toHaveBeenCalledWith({ visits: [] });
    expect(next).not.toHaveBeenCalled();
  });

  test('para superadmin no aplica scope de empresa', async () => {
    isSuperAdmin.mockReturnValue(true);

    const req = {
      query: {},
      user: { role: 'superadmin', company_id: null },
    };
    const res = makeRes();
    const next = jest.fn();

    await getRecentVisits(req, res, next);

    const findAllArgs = Visit.findAll.mock.calls[0][0];
    expect(findAllArgs.where).toEqual({ status: 'checked_in' });
    expect(res.json).toHaveBeenCalledWith({ visits: [] });
    expect(next).not.toHaveBeenCalled();
  });
});
