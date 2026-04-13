const { body, param, query } = require('express-validator');

const visitValidation = {
  create: [
    body('visitor_name')
      .trim()
      .notEmpty().withMessage('El nombre del visitante es obligatorio')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .escape(),
    body('visitor_document')
      .trim()
      .notEmpty().withMessage('El documento es obligatorio')
      .isLength({ min: 3, max: 30 }).withMessage('El documento debe tener entre 3 y 30 caracteres')
      .escape(),
    body('visitor_company')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('La empresa no puede exceder 100 caracteres')
      .escape(),
    body('visitor_email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    body('visitor_phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
      .escape(),
    body('destination')
      .trim()
      .notEmpty().withMessage('El destino es obligatorio')
      .isLength({ max: 100 }).withMessage('El destino no puede exceder 100 caracteres')
      .escape(),
    body('purpose')
      .trim()
      .notEmpty().withMessage('El motivo es obligatorio')
      .isLength({ max: 255 }).withMessage('El motivo no puede exceder 255 caracteres')
      .escape(),
    body('notes')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres')
      .escape(),
    body('signature')
      .optional({ checkFalsy: true })
      .isString().withMessage('La firma debe ser una cadena de texto'),
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('visitor_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .escape(),
    body('visitor_document')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 }).withMessage('El documento debe tener entre 3 y 30 caracteres')
      .escape(),
    body('visitor_company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .escape(),
    body('visitor_email')
      .optional()
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    body('visitor_phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .escape(),
    body('destination')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .escape(),
    body('purpose')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .escape(),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .escape(),
    body('signature')
      .optional({ checkFalsy: true })
      .isString().withMessage('La firma debe ser una cadena de texto'),
  ],
  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido'),
    query('status').optional().isIn(['pending', 'checked_in', 'checked_out', 'cancelled']).withMessage('Estado inválido'),
    query('search').optional().trim().escape(),
    query('date_from').optional().isISO8601().withMessage('Fecha desde inválida'),
    query('date_to').optional().isISO8601().withMessage('Fecha hasta inválida'),
  ],
};

const authValidation = {
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('El usuario es obligatorio')
      .isLength({ min: 3, max: 50 })
      .escape(),
    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 4, max: 100 }),
  ],
};

const userValidation = {
  create: [
    body('username')
      .trim()
      .notEmpty().withMessage('El nombre de usuario es obligatorio')
      .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Solo letras, números, puntos, guiones y guiones bajos'),
    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 8, max: 100 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('full_name')
      .trim()
      .notEmpty().withMessage('El nombre completo es obligatorio')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .escape(),
    body('role')
      .optional()
      .isIn(['admin', 'user']).withMessage('Rol inválido'),
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .escape(),
    body('role')
      .optional()
      .isIn(['admin', 'user']).withMessage('Rol inválido'),
    body('active')
      .optional()
      .isBoolean().withMessage('El campo activo debe ser verdadero o falso'),
  ],
  changePassword: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 8, max: 100 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
};

module.exports = { visitValidation, authValidation, userValidation };
