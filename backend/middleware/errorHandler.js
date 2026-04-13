const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

function validationMiddleware(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Error de validación',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

function errorHandler(err, req, res, _next) {
  logger.error(`${err.message}`, { stack: err.stack, url: req.originalUrl, method: req.method });

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor' : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.originalUrl}` });
}

module.exports = { validationMiddleware, errorHandler, notFound };
