const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/errorHandler');
const { authValidation } = require('../utils/validators');

router.post('/login', authValidation.login, validationMiddleware, login);
router.get('/me', authMiddleware, me);

module.exports = router;
