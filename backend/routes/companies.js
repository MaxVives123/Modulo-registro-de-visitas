const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const companyController = require('../controllers/companyController');

router.use(authMiddleware);

const companyCreateValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 150 }).escape(),
  body('rif').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).escape(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido').normalizeEmail(),
];

const companyUpdateValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  body('name').optional().trim().isLength({ min: 2, max: 150 }).escape(),
  body('rif').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).escape(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('active').optional().isBoolean().withMessage('El campo activo debe ser true o false'),
];

// Lectura: todos los autenticados (controller filtra según rol)
router.get('/', companyController.list);
router.get('/:id', param('id').isInt({ min: 1 }).withMessage('ID inválido'), validationMiddleware, companyController.getById);

// Escritura: solo superadmin/admin
router.post('/', adminOnly, companyCreateValidation, validationMiddleware, companyController.create);
router.put('/:id', adminOnly, companyUpdateValidation, validationMiddleware, companyController.update);
router.delete('/:id', adminOnly, param('id').isInt({ min: 1 }).withMessage('ID inválido'), validationMiddleware, companyController.remove);

module.exports = router;
