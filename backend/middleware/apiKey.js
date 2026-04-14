const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * apiKeyAuth: Solo para sistemas externos (X-Api-Key).
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

/**
 * apiKeyOrAdminJWT: Acepta API key (sistemas externos) O JWT de superadmin/admin (panel interno).
 * Úsalo en endpoints que deben ser accesibles tanto desde el panel web como desde integraciones externas.
 */
function apiKeyOrAdminJWT(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;

  // Si hay API key, usarla
  if (key) {
    if (!process.env.INTEGRATION_API_KEY) {
      return res.status(503).json({ error: 'Integraciones no configuradas en el servidor.' });
    }
    if (key !== process.env.INTEGRATION_API_KEY) {
      return res.status(401).json({ error: 'API key inválida.' });
    }
    return next();
  }

  // Si no hay API key, intentar JWT de superadmin
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'superadmin' || decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador global.' });
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
  }

  return res.status(401).json({ error: 'Se requiere API key o sesión de administrador.' });
}

module.exports = apiKeyAuth;
module.exports.apiKeyOrAdminJWT = apiKeyOrAdminJWT;
