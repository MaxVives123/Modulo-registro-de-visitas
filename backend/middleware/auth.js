const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/** Roles con acceso global (sin restricción por empresa) */
function isSuperAdmin(role) {
  return role === 'superadmin' || role === 'admin';
}

/** Verifica JWT y adjunta req.user */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Token inválido: ${error.message}`);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/** Solo superadmin / admin legado */
function adminOnly(req, res, next) {
  if (!isSuperAdmin(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador global' });
  }
  next();
}

/** superadmin, admin (legado) O admin_empresa */
function companyAdminOrAbove(req, res, next) {
  const { role } = req.user;
  if (isSuperAdmin(role) || role === 'admin_empresa') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
}

/**
 * Adjunta req.companyId:
 *  - null  → superadmin / admin legado (sin filtro de empresa)
 *  - X     → id de empresa del usuario autenticado
 */
function scopeToCompany(req, res, next) {
  req.companyId = isSuperAdmin(req.user.role) ? null : (req.user.company_id || null);
  next();
}

module.exports = { authMiddleware, adminOnly, companyAdminOrAbove, scopeToCompany, isSuperAdmin };
