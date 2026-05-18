/**
 * Tests para visitController.update
 *
 * Verifica:
 * 1. Email vacío en actualización no genera error (guarda NULL)
 * 2. Las fechas check_in / check_out se actualizan correctamente
 * 3. Campos de texto opcionales vacíos se guardan como NULL
 */

const mockVisit = {
  id: 1,
  update: jest.fn().mockResolvedValue(true),
};

jest.mock('../models', () => ({
  Visit: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  User: {},
  Company: {},
}));

jest.mock('../middleware/auth', () => ({
  isSuperAdmin: jest.fn().mockReturnValue(false),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../controllers/notificationController', () => ({
  notifyAdmins: jest.fn(),
  notifyUser: jest.fn(),
}));

jest.mock('../utils/emailService', () => ({
  sendVisitNotification: jest.fn().mockResolvedValue(true),
}));

const { Visit } = require('../models');
const { update } = require('../controllers/visitController');

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res;
}

function makeReq(body = {}, params = { id: '1' }) {
  return {
    params,
    body,
    user: { role: 'admin_empresa', company_id: 5 },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVisit.update.mockResolvedValue(true);
  Visit.findOne.mockResolvedValue(mockVisit);
  Visit.findByPk.mockResolvedValue({ ...mockVisit, visitor_email: null });
});

// ─── Email vacío ────────────────────────────────────────────────────────────

describe('visitController.update — email vacío', () => {
  test('email vacío se convierte a NULL sin error', async () => {
    const req = makeReq({ visitor_email: '' });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_email: null }),
    );
    expect(res.json).toHaveBeenCalled();
  });

  test('email con espacios en blanco se convierte a NULL', async () => {
    const req = makeReq({ visitor_email: '   ' });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_email: null }),
    );
  });

  test('email válido se guarda tal cual', async () => {
    const req = makeReq({ visitor_email: 'test@empresa.com' });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_email: 'test@empresa.com' }),
    );
  });

  test('email undefined no se incluye en el update', async () => {
    const req = makeReq({ visitor_name: 'Juan' }); // sin visitor_email
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    const updateArg = mockVisit.update.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty('visitor_email');
  });
});

// ─── Fechas check_in / check_out ────────────────────────────────────────────

describe('visitController.update — fechas check_in y check_out', () => {
  test('check_in en formato ISO se guarda correctamente', async () => {
    const isoDate = '2025-06-15T09:30:00.000Z';
    const req = makeReq({ check_in: isoDate });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ check_in: isoDate }),
    );
  });

  test('check_out en formato ISO se guarda correctamente', async () => {
    const isoDate = '2025-06-15T17:00:00.000Z';
    const req = makeReq({ check_out: isoDate });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ check_out: isoDate }),
    );
  });

  test('se pueden actualizar check_in y check_out a la vez', async () => {
    const req = makeReq({
      check_in: '2025-06-15T08:00:00.000Z',
      check_out: '2025-06-15T16:00:00.000Z',
    });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        check_in: '2025-06-15T08:00:00.000Z',
        check_out: '2025-06-15T16:00:00.000Z',
      }),
    );
  });

  test('visita no encontrada devuelve 404', async () => {
    Visit.findOne.mockResolvedValue(null);
    const req = makeReq({ check_in: '2025-06-15T09:00:00.000Z' });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});

// ─── Otros campos opcionales → NULL ─────────────────────────────────────────

describe('visitController.update — campos opcionales a NULL', () => {
  test.each([
    ['visitor_phone', ''],
    ['vehicle_plate', ''],
    ['host_name', ''],
    ['host_email', ''],
    ['site', ''],
    ['building', ''],
    ['notes', ''],
  ])('%s vacío se guarda como NULL', async (field, value) => {
    const req = makeReq({ [field]: value });
    const res = makeRes();
    const next = jest.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ [field]: null }),
    );
  });
});
