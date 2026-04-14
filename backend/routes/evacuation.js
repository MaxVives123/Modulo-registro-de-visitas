const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { evacuationValidation } = require('../utils/validators');
const {
  trigger, closeEvent, getActive, getRollcall, presentNow, getHistory,
} = require('../controllers/evacuationController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/evacuation/active
router.get('/active', getActive);

// GET /api/evacuation/present-now
router.get('/present-now', presentNow);

// GET /api/evacuation/history
router.get('/history', getHistory);

// POST /api/evacuation/trigger
router.post('/trigger', evacuationValidation.trigger, validationMiddleware, trigger);

// POST /api/evacuation/:id/close
router.post('/:id/close', closeEvent);

// GET /api/evacuation/:id/rollcall
router.get('/:id/rollcall', getRollcall);

module.exports = router;
