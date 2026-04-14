const logger = require('../utils/logger');

/**
 * Middleware de autenticación para endpoints de integración externa.
 * Acepta la API key via header X-Api-Key o query param api_key.
 * La key se define en INTEGRATION_API_KEY del .env.
 */
function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;

  if (!process.env.INTEGRATION_API_KEY) {
    logger.warn('INTEGRATION_API_KEY no configurada. Endpoint de integración denegado.');
    return res.status(503).json({ error: 'Integraciones no configuradas en el servidor.' });
  }

  if (!key || key !== process.env.INTEGRATION_API_KEY) {
    logger.warn(`Intento de acceso a integración con API key inválida desde ${req.ip}`);
    return res.status(401).json({ error: 'API key inválida o ausente.' });
  }

  logger.info(`Integración autenticada desde ${req.ip} – ${req.method} ${req.path}`);
  next();
}

module.exports = apiKeyAuth;
