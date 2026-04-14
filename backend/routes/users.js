const express = require('express');
const router = express.Router();
const { authMiddleware, companyAdminOrAbove } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const { userValidation } = require('../utils/validators');
const userController = require('../controllers/userController');

router.use(authMiddleware);
router.use(companyAdminOrAbove);

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.post('/', userValidation.create, validationMiddleware, userController.create);
router.put('/:id', userValidation.update, validationMiddleware, userController.update);
router.put('/:id/password', userValidation.changePassword, validationMiddleware, userController.changePassword);
router.delete('/:id', userController.remove);

module.exports = router;
