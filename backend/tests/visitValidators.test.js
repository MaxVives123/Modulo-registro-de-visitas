/**
 * Tests para los validadores de visita (express-validator)
 *
 * Verifica que visitor_email vacío en una actualización no produzca error de validación.
 */

const { validationResult } = require('express-validator');
const { visitValidation } = require('../utils/validators');

async function runValidators(validators, body, params = {}) {
  const req = {
    body,
    params: { id: '1', ...params },
    query: {},
    headers: {},
    get: () => '',
  };
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('visitValidation.update — campo visitor_email', () => {
  test('email vacío ("") no genera error de validación', async () => {
    const result = await runValidators(visitValidation.update, {
      visitor_email: '',
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors).toHaveLength(0);
  });

  test('email con solo espacios no genera error de validación', async () => {
    const result = await runValidators(visitValidation.update, {
      visitor_email: '   ',
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors).toHaveLength(0);
  });

  test('email inválido SÍ genera error de validación', async () => {
    const result = await runValidators(visitValidation.update, {
      visitor_email: 'no-es-un-email',
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors.length).toBeGreaterThan(0);
  });

  test('email válido no genera error', async () => {
    const result = await runValidators(visitValidation.update, {
      visitor_email: 'usuario@empresa.com',
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors).toHaveLength(0);
  });

  test('visitor_email ausente (undefined) no genera error', async () => {
    const result = await runValidators(visitValidation.update, {
      visitor_name: 'Juan',
      // visitor_email no enviado
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors).toHaveLength(0);
  });
});

describe('visitValidation.create — campo visitor_email', () => {
  test('email vacío en creación no genera error', async () => {
    const result = await runValidators(visitValidation.create, {
      visitor_name: 'Juan García',
      visitor_email: '',
      destination: 'Recepción',
      purpose: 'Reunión',
    });
    const emailErrors = result.array().filter((e) => e.path === 'visitor_email');
    expect(emailErrors).toHaveLength(0);
  });
});
