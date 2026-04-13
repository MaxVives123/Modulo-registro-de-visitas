const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const qrController = require('../controllers/qrController');

// Public: validate QR and check-out by QR (for scanning)
router.get('/validate/:code', qrController.validateQR);
router.post('/checkout/:code', qrController.checkOutByQR);

// Protected: generate QR and credential data
router.get('/generate/:id', authMiddleware, qrController.generateQR);
router.get('/credential/:id', authMiddleware, qrController.getCredentialData);

module.exports = router;
