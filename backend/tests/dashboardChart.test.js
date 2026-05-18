/**
 * Tests para dashboardController.getActivityChart
 *
 * Verifica que la gráfica use COALESCE(check_in, created_at) para que
 * modificar la fecha de check_in de una visita se refleje en el gráfico.
 */

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
const { getActivityChart } = require('../controllers/dashboardController');

function makeRes() {
  return { json: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  isSuperAdmin.mockReturnValue(false);
  Visit.findAll.mockResolvedValue([]);
});

describe('dashboardController.getActivityChart — usa COALESCE(check_in, created_at)', () => {
  test('la consulta agrupa por COALESCE(check_in, created_at), no solo created_at', async () => {
    const req = {
      query: { days: '7' },
      user: { role: 'admin_empresa', company_id: 1 },
    };
    const res = makeRes();
    const next = jest.fn();

    await getActivityChart(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(Visit.findAll).toHaveBeenCalledTimes(1);

    const args = Visit.findAll.mock.calls[0][0];

    // Comprueba que el atributo de fecha usa fn('COALESCE', ...) con check_in
    const dateAttr = args.attributes[0];
    // Es un array [expresión_sequelize, alias]
    expect(dateAttr[1]).toBe('date');

    // La expresión debe ser DATE(COALESCE(...)) — verificar que contiene check_in
    const exprStr = JSON.stringify(dateAttr[0]);
    expect(exprStr).toContain('COALESCE');
    expect(exprStr).toContain('check_in');
    expect(exprStr).toContain('created_at');
  });

  test('sin visitas devuelve arrays de longitud days+1 rellenos de ceros', async () => {
    Visit.findAll.mockResolvedValue([]);
    const req = {
      query: { days: '7' },
      user: { role: 'admin_empresa', company_id: 1 },
    };
    const res = makeRes();

    await getActivityChart(req, res, jest.fn());

    const { labels, data } = res.json.mock.calls[0][0];
    expect(labels).toHaveLength(8); // días 7..0 = 8 puntos
    expect(data).toHaveLength(8);
    expect(data.every((v) => v === 0)).toBe(true);
  });

  test('con visitas mapea las fechas correctamente', async () => {
    // Simular que hay 3 visitas en una fecha concreta
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    Visit.findAll.mockResolvedValue([
      { date: todayStr, count: '3' },
    ]);

    const req = {
      query: { days: '7' },
      user: { role: 'admin_empresa', company_id: 1 },
    };
    const res = makeRes();

    await getActivityChart(req, res, jest.fn());

    const { labels, data } = res.json.mock.calls[0][0];
    const idx = labels.indexOf(todayStr);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(data[idx]).toBe(3);
  });

  test('para superadmin no aplica scope de empresa', async () => {
    isSuperAdmin.mockReturnValue(true);
    const req = {
      query: { days: '7' },
      user: { role: 'superadmin', company_id: null },
    };
    const res = makeRes();

    await getActivityChart(req, res, jest.fn());

    const args = Visit.findAll.mock.calls[0][0];
    expect(args.where).not.toHaveProperty('company_id');
  });

  test('para admin_empresa aplica scope de empresa en el WHERE', async () => {
    isSuperAdmin.mockReturnValue(false);
    const req = {
      query: { days: '7' },
      user: { role: 'admin_empresa', company_id: 42 },
    };
    const res = makeRes();

    await getActivityChart(req, res, jest.fn());

    const args = Visit.findAll.mock.calls[0][0];
    expect(args.where).toHaveProperty('company_id', 42);
  });
});
