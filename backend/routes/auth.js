const express = require('express');
const router = express.Router();
const { login, me, registerCompany } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const { authValidation, registerCompanyValidation } = require('../utils/validators');

router.post('/login', authValidation.login, validationMiddleware, login);
router.get('/me', authMiddleware, me);
router.post('/register-company', registerCompanyValidation, validationMiddleware, registerCompany);

module.exports = router;
