const { Op } = require('sequelize');
const { User, Visit, EvacuationEvent, EvacuationNotification } = require('../models');
const messagingService = require('../utils/messagingService');
const { sendGenericEmail } = require('../utils/emailService');
const { isSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/integrations/notify
 * Envía SMS, WhatsApp o email desde sistema externo.
 *
 * Body: { channel: 'sms'|'whatsapp'|'email', to: string, message: string, subject?: string }
 */
async function notify(req, res, next) {
  try {
    const { channel, to, message, subject } = req.body;

    if (!channel || !to || !message) {
      return res.status(400).json({ error: 'Campos requeridos: channel, to, message' });
    }

    let result;
    if (channel === 'email') {
      await sendGenericEmail({ to, subject: subject || 'Notificación del sistema', html: `<p>${message}</p>` });
      result = { status: 'sent', provider: 'email' };
    } else {
      result = await messagingService.send({ channel, to, message });
    }

    logger.info(`[INTEGRACIÓN] Notificación ${channel} → ${to}`);
    res.json({ result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/access-events
 * Recibe eventos de control de acceso (badge in/out) y actualiza presencia de empleados.
 *
 * Body: { event_type: 'badge_in'|'badge_out', employee_identifier: string, door?: string, timestamp?: string }
 * employee_identifier puede ser username o email.
 */
async function accessEvent(req, res, next) {
  try {
    const { event_type, employee_identifier, door, timestamp } = req.body;

    if (!event_type || !employee_identifier) {
      return res.status(400).json({ error: 'Campos requeridos: event_type, employee_identifier' });
    }

    if (!['badge_in', 'badge_out'].includes(event_type)) {
      return res.status(400).json({ error: 'event_type debe ser badge_in o badge_out' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: employee_identifier },
          { email: employee_identifier },
        ],
        active: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: `Empleado no encontrado: ${employee_identifier}` });
    }

    const isPresent = event_type === 'badge_in';
    const accessTime = timestamp ? new Date(timestamp) : new Date();

    await user.update({
      is_present: isPresent,
      last_access_at: accessTime,
    });

    logger.info(`[CONTROL ACCESO] ${event_type} – ${user.username} (${door || 'N/A'}) a las ${accessTime.toISOString()}`);

    res.json({
      message: `Presencia actualizada: ${user.full_name} → ${isPresent ? 'Dentro' : 'Fuera'}`,
      user: { id: user.id, full_name: user.full_name, is_present: isPresent, last_access_at: accessTime },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/integrations/presence
 * Devuelve ocupación actual centralizada: empleados presentes + visitantes check_in.
 *
 * Query: company_id (requerido si no viene en API key scope)
 */
async function presence(req, res, next) {
  try {
    const companyId = req.query.company_id ? parseInt(req.query.company_id, 10) : null;

    const visitorWhere = { status: 'checked_in' };
    const employeeWhere = { active: true, is_present: true };
    if (companyId) { visitorWhere.company_id = companyId; employeeWhere.company_id = companyId; }

    const [visitors, employees] = await Promise.all([
      Visit.findAll({
        where: visitorWhere,
        attributes: ['id', 'visitor_name', 'visitor_company', 'visitor_phone', 'destination', 'site', 'building', 'check_in', 'company_id'],
      }),
      User.findAll({
        where: employeeWhere,
        attributes: ['id', 'full_name', 'phone', 'department', 'site', 'building', 'last_access_at', 'company_id'],
      }),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      total: visitors.length + employees.length,
      visitors_count: visitors.length,
      employees_count: employees.length,
      visitors,
      employees,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/evacuation/trigger
 * Trigger externo de alarma de evacuación (para integración con sistemas de seguridad).
 *
 * Body: { company_id, channel?, message? }
 */
async function triggerEvacuation(req, res, next) {
  try {
    const { company_id, channel, message } = req.body;

    if (!company_id) return res.status(400).json({ error: 'Se requiere company_id' });

    const companyId = parseInt(company_id, 10);
    const activeEvent = await EvacuationEvent.findOne({
      where: { company_id: companyId, status: 'active' },
    });
    if (activeEvent) {
      return res.status(409).json({ error: 'Ya hay una evacuación activa.', event: activeEvent });
    }

    const ch = channel || 'mock';
    const msg = message || '⚠ EVACUACIÓN: Abandone el edificio por la salida más cercana. [Sistema externo]';

    const visitors = await Visit.findAll({
      where: { company_id: companyId, status: 'checked_in' },
      attributes: ['visitor_name', 'visitor_phone'],
    });
    const employees = await User.findAll({
      where: { company_id: companyId, active: true },
      attributes: ['full_name', 'phone'],
    });

    let sent = 0; let failed = 0;
    const notifications = [];
    for (const r of [
      ...visitors.map((v) => ({ type: 'visitor', name: v.visitor_name, phone: v.visitor_phone })),
      ...employees.map((e) => ({ type: 'employee', name: e.full_name, phone: e.phone })),
    ]) {
      if (!r.phone) { notifications.push({ recipient_type: r.type, recipient_name: r.name, status: 'failed', provider_response: 'Sin teléfono' }); continue; }
      try {
        const result = await messagingService.send({ channel: ch, to: r.phone, message: msg });
        sent++;
        notifications.push({ recipient_type: r.type, recipient_name: r.name, recipient_phone: r.phone, channel: ch, status: result.status, provider_response: result.sid, sent_at: new Date() });
      } catch (err) {
        failed++;
        notifications.push({ recipient_type: r.type, recipient_name: r.name, recipient_phone: r.phone, channel: ch, status: 'failed', provider_response: err.message, sent_at: new Date() });
      }
    }

    const event = await EvacuationEvent.create({
      company_id: companyId,
      triggered_by: null, // disparado por sistema externo (sin usuario interno)
      status: 'active',
      channel_used: ch,
      message: msg,
      triggered_at: new Date(),
      stats: { sent, failed, triggered_by: 'external_api' },
    });
    await EvacuationNotification.bulkCreate(notifications.map((n) => ({ ...n, event_id: event.id })));

    logger.info(`[INTEGRACIÓN] Evacuación activada externamente en empresa ${companyId}. Enviados: ${sent}`);
    res.status(201).json({ event, stats: { sent, failed } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/integrations/status
 * Estado general del sistema de integraciones (proveedor mensajería, etc.)
 */
async function status(req, res, next) {
  try {
    const messaging = messagingService.getProviderStatus();
    res.json({
      messaging,
      api_key_configured: !!process.env.INTEGRATION_API_KEY,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { notify, accessEvent, presence, triggerEvacuation, status };
