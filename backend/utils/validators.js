const { body, param, query } = require('express-validator');
const { JOB_LEVELS, DEPARTMENTS, SITES } = require('../models/User');

const VALID_CHANNELS = ['sms', 'whatsapp', 'both', 'mock'];

const visitValidation = {
  create: [
    body('visitor_name').trim().notEmpty().withMessage('El nombre del visitante es obligatorio')
      .isLength({ min: 2, max: 100 }).escape(),
    body('visitor_document').trim().notEmpty().withMessage('El documento es obligatorio')
      .isLength({ min: 3, max: 30 }).escape(),
    body('visitor_company').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('visitor_email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('visitor_phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('destination').trim().notEmpty().withMessage('El destino es obligatorio').isLength({ max: 100 }).escape(),
    body('purpose').trim().notEmpty().withMessage('El motivo es obligatorio').isLength({ max: 255 }).escape(),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
    body('signature').optional({ checkFalsy: true }).isString(),
    body('host_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('host_email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email del anfitrión inválido').normalizeEmail(),
    body('vehicle_plate').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('site').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('building').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('company_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('ID de empresa inválido'),
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('visitor_name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('visitor_document').optional().trim().isLength({ min: 3, max: 30 }).escape(),
    body('visitor_company').optional().trim().isLength({ max: 100 }).escape(),
    body('visitor_email').optional().trim().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('visitor_phone').optional().trim().isLength({ max: 20 }).escape(),
    body('destination').optional().trim().isLength({ max: 100 }).escape(),
    body('purpose').optional().trim().isLength({ max: 255 }).escape(),
    body('notes').optional().trim().isLength({ max: 500 }).escape(),
    body('signature').optional({ checkFalsy: true }).isString(),
    body('host_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('host_email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
    body('vehicle_plate').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('site').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('building').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('company_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('ID de empresa inválido'),
  ],
  list: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'checked_in', 'checked_out', 'cancelled']),
    query('search').optional().trim().escape(),
    query('vehicle_plate').optional().trim().escape(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
};

const authValidation = {
  login: [
    body('username').trim().notEmpty().withMessage('El usuario es obligatorio').isLength({ min: 3, max: 50 }).escape(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria').isLength({ min: 4, max: 100 }),
  ],
};

const registerCompanyValidation = [
  body('company_name').trim().notEmpty().withMessage('El nombre de la empresa es obligatorio').isLength({ max: 150 }).escape(),
  body('company_rif').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
  body('company_email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email de empresa inválido').normalizeEmail(),
  body('company_phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('admin_full_name').trim().notEmpty().withMessage('El nombre del administrador es obligatorio').isLength({ min: 2, max: 100 }).escape(),
  body('admin_username').trim().notEmpty().withMessage('El usuario es obligatorio')
    .isLength({ min: 3, max: 50 })
    .matches(/^[\p{L}\p{N}._-]+$/u).withMessage('Solo letras, números, puntos y guiones'),
  body('admin_password').notEmpty().withMessage('La contraseña es obligatoria').isLength({ min: 8, max: 100 }),
];

const userValidation = {
  create: [
    body('username').trim().notEmpty().withMessage('El nombre de usuario es obligatorio')
      .isLength({ min: 3, max: 50 })
      .matches(/^[\p{L}\p{N}._-]+$/u).withMessage('Solo letras, números, puntos y guiones'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria').isLength({ min: 8, max: 100 }),
    body('full_name').trim().notEmpty().withMessage('El nombre completo es obligatorio').isLength({ min: 2, max: 100 }).escape(),
    body('role').optional({ checkFalsy: true }).isIn(['superadmin', 'admin', 'admin_empresa', 'user']).withMessage('Rol inválido'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('dni').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
    body('job_level').optional({ checkFalsy: true }).isIn(JOB_LEVELS).withMessage('Nivel de cargo inválido'),
    body('job_title').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('department').optional({ checkFalsy: true }).isIn(DEPARTMENTS).withMessage('Departamento inválido'),
    body('site').optional({ checkFalsy: true }).isIn(SITES).withMessage('Sede inválida'),
    body('building').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('can_receive_visits').optional().isBoolean(),
    body('can_trigger_evacuation').optional().isBoolean(),
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('role').optional().isIn(['superadmin', 'admin', 'admin_empresa', 'user']).withMessage('Rol inválido'),
    body('active').optional().isBoolean(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
    body('dni').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
    body('job_level').optional({ checkFalsy: true }).isIn(JOB_LEVELS).withMessage('Nivel de cargo inválido'),
    body('job_title').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('department').optional({ checkFalsy: true }).isIn(DEPARTMENTS).withMessage('Departamento inválido'),
    body('site').optional({ checkFalsy: true }).isIn(SITES).withMessage('Sede inválida'),
    body('building').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('can_receive_visits').optional().isBoolean(),
    body('can_trigger_evacuation').optional().isBoolean(),
  ],
  changePassword: [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria').isLength({ min: 8, max: 100 }),
  ],
};

const evacuationValidation = {
  trigger: [
    body('channel').optional().isIn(VALID_CHANNELS).withMessage(`Canal debe ser: ${VALID_CHANNELS.join(', ')}`),
    body('message').optional().trim().isLength({ max: 500 }),
    body('company_id').optional({ checkFalsy: true }).isInt({ min: 1 }),
  ],
};

module.exports = { visitValidation, authValidation, userValidation, registerCompanyValidation, evacuationValidation };
