const express = require('express');
const rateLimit = require('express-rate-limit');
const apiKeyAuth = require('../middleware/apiKey');
const { apiKeyOrAdminJWT } = require('../middleware/apiKey');
const { notify, accessEvent, presence, triggerEvacuation, status } = require('../controllers/integrationsController');

const router = express.Router();

const integrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas peticiones de integración. Inténtalo de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const evacuationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas alarmas en poco tiempo.' },
});

// GET /api/integrations/status — accesible con API key O JWT superadmin (panel web)
router.get('/status', apiKeyOrAdminJWT, status);

// POST /api/integrations/notify — accesible con API key O JWT superadmin (panel web para probar)
router.post('/notify', apiKeyOrAdminJWT, integrationLimiter, notify);

// Resto de rutas: solo API key (sistemas externos)
router.get('/presence', apiKeyAuth, presence);
router.post('/access-events', apiKeyAuth, integrationLimiter, accessEvent);
router.post('/evacuation/trigger', apiKeyAuth, evacuationLimiter, triggerEvacuation);

module.exports = router;
