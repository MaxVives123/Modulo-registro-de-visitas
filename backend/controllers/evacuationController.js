const ExcelJS = require('exceljs');
const { EvacuationEvent, EvacuationNotification, Visit, User, Company } = require('../models');
const messagingService = require('../utils/messagingService');
const logger = require('../utils/logger');
const { isSuperAdmin } = require('../middleware/auth');

/**
 * Determina si el usuario puede activar la alarma de evacuación.
 */
function userCanTrigger(user) {
  return (
    isSuperAdmin(user.role) ||
    user.role === 'admin_empresa' ||
    user.can_trigger_evacuation === true
  );
}

/**
 * Obtiene el company_id del request (desde token o body para superadmin).
 */
function resolveCompanyId(req) {
  if (isSuperAdmin(req.user.role)) {
    const cid = req.body.company_id || req.query.company_id;
    return cid ? parseInt(cid, 10) : null;
  }
  return req.user.company_id || null;
}

/**
 * POST /api/evacuation/trigger
 * Activa la alarma de evacuación y envía notificaciones masivas.
 */
async function trigger(req, res, next) {
  try {
    if (!userCanTrigger(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para activar la evacuación.' });
    }

    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'Se requiere company_id para esta operación.' });
    }

    // Comprobar que no hay evacuación activa
    const activeEvent = await EvacuationEvent.findOne({
      where: { company_id: companyId, status: 'active' },
    });
    if (activeEvent) {
      return res.status(409).json({ error: 'Ya hay una evacuación activa para esta empresa.', event: activeEvent });
    }

    const channel = req.body.channel || 'mock';
    const customMessage = req.body.message || null;
    const defaultMsg = `⚠ EVACUACIÓN: Por favor, abandone el edificio inmediatamente por la salida más cercana. Este es un mensaje oficial del sistema.`;
    const evacuMsg = customMessage || defaultMsg;

    // Obtener visitantes actualmente en planta (checked_in)
    const visitors = await Visit.findAll({
      where: { company_id: companyId, status: 'checked_in' },
      attributes: ['id', 'visitor_name', 'visitor_phone', 'destination', 'site', 'building'],
    });

    // Obtener empleados con teléfono y presentes en planta
    const employees = await User.findAll({
      where: { company_id: companyId, active: true },
      attributes: ['id', 'full_name', 'phone', 'department', 'site', 'building', 'is_present'],
    });

    const results = { sent: 0, failed: 0, no_phone: 0, details: [] };
    const notifications = [];

    const allRecipients = [
      ...visitors.filter((v) => v.visitor_phone).map((v) => ({
        type: 'visitor', name: v.visitor_name, phone: v.visitor_phone,
      })),
      ...visitors.filter((v) => !v.visitor_phone).map((v) => ({
        type: 'visitor', name: v.visitor_name, phone: null,
      })),
      ...employees.filter((e) => e.phone).map((e) => ({
        type: 'employee', name: e.full_name, phone: e.phone,
      })),
      ...employees.filter((e) => !e.phone).map((e) => ({
        type: 'employee', name: e.full_name, phone: null,
      })),
    ];

    for (const r of allRecipients) {
      if (!r.phone) {
        results.no_phone++;
        notifications.push({
          recipient_type: r.type,
          recipient_name: r.name,
          recipient_phone: null,
          channel,
          status: 'failed',
          provider_response: 'Sin teléfono registrado',
          sent_at: new Date(),
        });
        continue;
      }

      try {
        const msgResult = await messagingService.send({ channel, to: r.phone, message: evacuMsg });
        results.sent++;
        results.details.push({ ...r, status: msgResult.status, sid: msgResult.sid });
        notifications.push({
          recipient_type: r.type,
          recipient_name: r.name,
          recipient_phone: r.phone,
          channel,
          status: msgResult.status || 'sent',
          provider_response: msgResult.sid || null,
          sent_at: new Date(),
        });
      } catch (err) {
        results.failed++;
        results.details.push({ ...r, status: 'failed', error: err.message });
        notifications.push({
          recipient_type: r.type,
          recipient_name: r.name,
          recipient_phone: r.phone,
          channel,
          status: 'failed',
          provider_response: err.message,
          sent_at: new Date(),
        });
      }
    }

    // Crear evento
    const event = await EvacuationEvent.create({
      company_id: companyId,
      triggered_by: req.user.id,
      status: 'active',
      channel_used: channel,
      message: evacuMsg,
      triggered_at: new Date(),
      stats: {
        sent: results.sent,
        failed: results.failed,
        no_phone: results.no_phone,
        visitors_count: visitors.length,
        employees_count: employees.length,
      },
    });

    // Guardar notificaciones individuales
    await EvacuationNotification.bulkCreate(
      notifications.map((n) => ({ ...n, event_id: event.id })),
    );

    logger.info(`[EVACUACIÓN] Activada por ${req.user.username} en empresa ${companyId}. Enviados: ${results.sent}, Fallidos: ${results.failed}`);

    res.status(201).json({ event, stats: results });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/evacuation/:id/close
 * Cierra una evacuación activa.
 */
async function closeEvent(req, res, next) {
  try {
    if (!userCanTrigger(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para cerrar la evacuación.' });
    }

    const companyId = resolveCompanyId(req);
    const where = { id: req.params.id, status: 'active' };
    if (!isSuperAdmin(req.user.role)) where.company_id = companyId;

    const event = await EvacuationEvent.findOne({ where });
    if (!event) return res.status(404).json({ error: 'Evacuación activa no encontrada.' });

    await event.update({
      status: 'closed',
      closed_at: new Date(),
      closed_by: req.user.id,
    });

    logger.info(`[EVACUACIÓN] Cerrada por ${req.user.username} (evento ${event.id})`);
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/evacuation/active
 * Devuelve el evento activo y métricas de presencia.
 */
async function getActive(req, res, next) {
  try {
    const companyId = resolveCompanyId(req);
    const where = { status: 'active' };
    if (companyId) where.company_id = companyId;

    const event = await EvacuationEvent.findOne({
      where,
      include: [
        { model: User, as: 'triggeredBy', attributes: ['id', 'full_name', 'username'] },
      ],
      order: [['triggered_at', 'DESC']],
    });

    const presentVisitors = companyId
      ? await Visit.count({ where: { company_id: companyId, status: 'checked_in' } })
      : 0;
    const presentEmployees = companyId
      ? await User.count({ where: { company_id: companyId, active: true, is_present: true } })
      : 0;

    res.json({ event, metrics: { present_visitors: presentVisitors, present_employees: presentEmployees } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/evacuation/:id/rollcall
 * Devuelve listado completo para recuento de evacuación.
 */
async function getRollcall(req, res, next) {
  try {
    const companyId = resolveCompanyId(req);
    const eventWhere = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) eventWhere.company_id = companyId;

    const event = await EvacuationEvent.findOne({ where: eventWhere });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado.' });

    const cid = event.company_id;

    const [visitors, employees, notifications] = await Promise.all([
      Visit.findAll({
        where: { company_id: cid, status: 'checked_in' },
        attributes: ['id', 'visitor_name', 'visitor_document', 'visitor_company', 'visitor_phone', 'destination', 'site', 'building', 'check_in'],
        order: [['check_in', 'ASC']],
      }),
      User.findAll({
        where: { company_id: cid, active: true, is_present: true },
        attributes: ['id', 'full_name', 'dni', 'phone', 'department', 'job_title', 'site', 'building'],
        order: [['full_name', 'ASC']],
      }),
      EvacuationNotification.findAll({ where: { event_id: event.id } }),
    ]);

    // Exportar CSV si se solicita
    if (req.query.format === 'csv') {
      return _exportRollcallCSV(res, event, visitors, employees);
    }

    res.json({ event, visitors, employees, notifications });
  } catch (error) {
    next(error);
  }
}

function _exportRollcallCSV(res, event, visitors, employees) {
  const rows = [];
  rows.push(['Tipo', 'Nombre', 'Identificación', 'Teléfono', 'Destino/Dpto', 'Sede', 'Edificio', 'Hora entrada']);
  visitors.forEach((v) => {
    rows.push(['Visitante', v.visitor_name, v.visitor_document || '', v.visitor_phone || '', v.destination, v.site || '', v.building || '', v.check_in ? new Date(v.check_in).toLocaleString('es-ES') : '']);
  });
  employees.forEach((e) => {
    rows.push(['Empleado', e.full_name, e.dni || '', e.phone || '', e.department || '', e.site || '', e.building || '', '']);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=recuento_evacuacion_${event.id}.csv`);
  res.send('\uFEFF' + csv);
}

/**
 * GET /api/evacuation/present-now
 * Tiempo real: quién está en planta ahora mismo.
 */
async function presentNow(req, res, next) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Se requiere company_id.' });

    const visitorWhere = { company_id: companyId, status: 'checked_in' };
    const employeeWhere = { company_id: companyId, active: true, is_present: true };

    if (req.query.site) { visitorWhere.site = req.query.site; employeeWhere.site = req.query.site; }
    if (req.query.building) { visitorWhere.building = req.query.building; employeeWhere.building = req.query.building; }
    if (req.query.department) employeeWhere.department = req.query.department;

    const [visitors, employees] = await Promise.all([
      Visit.findAll({
        where: visitorWhere,
        attributes: ['id', 'visitor_name', 'visitor_document', 'visitor_company', 'visitor_phone', 'destination', 'site', 'building', 'check_in'],
        order: [['check_in', 'ASC']],
      }),
      User.findAll({
        where: employeeWhere,
        attributes: ['id', 'full_name', 'dni', 'phone', 'department', 'job_title', 'site', 'building', 'last_access_at'],
        order: [['full_name', 'ASC']],
      }),
    ]);

    res.json({
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
 * GET /api/evacuation/history
 * Historial de evacuaciones de la empresa.
 */
async function getHistory(req, res, next) {
  try {
    const companyId = resolveCompanyId(req);
    const where = {};
    if (companyId) where.company_id = companyId;

    const events = await EvacuationEvent.findAll({
      where,
      include: [
        { model: User, as: 'triggeredBy', attributes: ['id', 'full_name'] },
        { model: User, as: 'closedBy', attributes: ['id', 'full_name'] },
      ],
      order: [['triggered_at', 'DESC']],
      limit: 50,
    });

    res.json({ events });
  } catch (error) {
    next(error);
  }
}

module.exports = { trigger, closeEvent, getActive, getRollcall, presentNow, getHistory };
