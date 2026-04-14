const express = require('express');
const rateLimit = require('express-rate-limit');
const apiKeyAuth = require('../middleware/apiKey');
const { notify, accessEvent, presence, triggerEvacuation, status } = require('../controllers/integrationsController');

const router = express.Router();

// Rate limiting específico para integraciones externas
const integrationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60,
  message: { error: 'Demasiadas peticiones de integración. Inténtalo de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const evacuationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5,
  message: { error: 'Demasiadas alarmas en poco tiempo.' },
});

// Todas las rutas de integración requieren API key
router.use(apiKeyAuth);
router.use(integrationLimiter);

// GET  /api/integrations/status    — estado del proveedor de mensajería
router.get('/status', status);

// GET  /api/integrations/presence  — presencia actual centralizada
router.get('/presence', presence);

// POST /api/integrations/notify    — enviar SMS/WhatsApp/email
router.post('/notify', notify);

// POST /api/integrations/access-events — badge in/out desde control de acceso
router.post('/access-events', accessEvent);

// POST /api/integrations/evacuation/trigger — trigger externo de evacuación
router.post('/evacuation/trigger', evacuationLimiter, triggerEvacuation);

module.exports = router;
