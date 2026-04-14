const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { Visit, User, Company } = require('../models');
const logger = require('../utils/logger');
const { buildVisitExportWhere } = require('../utils/visitExportWhere');
const { notifyAdmins, notifyUser } = require('./notificationController');
const { sendVisitNotification } = require('../utils/emailService');
const { isSuperAdmin } = require('../middleware/auth');

const COMPANY_INCLUDE = { model: Company, as: 'company', attributes: ['id', 'name'] };

const STATUS_LABELS = {
  pending: 'Pendiente',
  checked_in: 'En instalaciones',
  checked_out: 'Salida registrada',
  cancelled: 'Cancelada',
};

function applyCompanyScope(where, req) {
  const scope = isSuperAdmin(req.user.role) ? null : (req.user.company_id || null);
  if (scope) where.company_id = scope;
  return scope;
}

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const where = {};
    applyCompanyScope(where, req);

    if (isSuperAdmin(req.user.role) && req.query.company_id) {
      where.company_id = parseInt(req.query.company_id, 10);
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.vehicle_plate) {
      where.vehicle_plate = { [Op.iLike]: `%${req.query.vehicle_plate}%` };
    }
    if (req.query.site) where.site = req.query.site;
    if (req.query.building) where.building = req.query.building;

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      where[Op.or] = [
        { visitor_name: { [Op.iLike]: search } },
        { visitor_document: { [Op.iLike]: search } },
        { visitor_company: { [Op.iLike]: search } },
        { destination: { [Op.iLike]: search } },
        { purpose: { [Op.iLike]: search } },
        { vehicle_plate: { [Op.iLike]: search } },
      ];
    }

    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) where.created_at[Op.gte] = new Date(req.query.date_from);
      if (req.query.date_to) {
        const dateTo = new Date(req.query.date_to);
        dateTo.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = dateTo;
      }
    }

    if (req.query.destination) where.destination = req.query.destination;

    const { rows: visits, count: total } = await Visit.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] },
        COMPANY_INCLUDE,
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({ visits, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const where = { id: req.params.id };
    applyCompanyScope(where, req);

    const visit = await Visit.findOne({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] },
        COMPANY_INCLUDE,
      ],
    });

    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });
    res.json({ visit });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const qrCode = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();

    const visit = await Visit.create({
      visitor_name: req.body.visitor_name,
      visitor_document: req.body.visitor_document,
      visitor_company: nullIfEmpty(req.body.visitor_company),
      visitor_email: nullIfEmpty(req.body.visitor_email),
      visitor_phone: nullIfEmpty(req.body.visitor_phone),
      destination: req.body.destination,
      purpose: req.body.purpose,
      notes: nullIfEmpty(req.body.notes),
      signature: nullIfEmpty(req.body.signature),
      host_name: nullIfEmpty(req.body.host_name),
      host_email: nullIfEmpty(req.body.host_email),
      vehicle_plate: nullIfEmpty(req.body.vehicle_plate),
      site: nullIfEmpty(req.body.site),
      building: nullIfEmpty(req.body.building),
      company_id: isSuperAdmin(req.user.role)
        ? (req.body.company_id ? parseInt(req.body.company_id, 10) : null)
        : (req.user.company_id || null),
      qr_code: qrCode,
      status: 'checked_in',
      check_in: new Date(),
      created_by: req.user.id,
    });

    const fullVisit = await Visit.findByPk(visit.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] },
        COMPANY_INCLUDE,
      ],
    });

    sendVisitNotification(visit).catch(() => {});

    notifyAdmins(
      'Nueva visita',
      `${visit.visitor_name} → ${visit.destination}`,
      'info',
      visit.company_id,
    );

    logger.info(`Visita creada: ${visit.id} - ${visit.visitor_name}`);
    res.status(201).json({ visit: fullVisit });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const whereUpd = { id: req.params.id };
    applyCompanyScope(whereUpd, req);
    const visit = await Visit.findOne({ where: whereUpd });

    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });

    const allowedFields = [
      'visitor_name', 'visitor_document', 'visitor_company',
      'visitor_email', 'visitor_phone', 'destination', 'purpose', 'notes', 'signature',
      'host_name', 'host_email', 'vehicle_plate', 'site', 'building', 'company_id',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await visit.update(updates);

    const fullVisit = await Visit.findByPk(visit.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] },
        COMPANY_INCLUDE,
      ],
    });

    logger.info(`Visita actualizada: ${visit.id}`);
    res.json({ visit: fullVisit });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const whereRm = { id: req.params.id };
    applyCompanyScope(whereRm, req);
    const visit = await Visit.findOne({ where: whereRm });

    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });

    await visit.destroy();
    logger.info(`Visita eliminada: ${req.params.id}`);
    res.json({ message: 'Visita eliminada correctamente' });
  } catch (error) {
    next(error);
  }
}

async function checkIn(req, res, next) {
  try {
    const whereCI = { id: req.params.id };
    applyCompanyScope(whereCI, req);
    const visit = await Visit.findOne({ where: whereCI });

    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });
    if (visit.status !== 'pending') return res.status(400).json({ error: 'La visita no está en estado pendiente' });

    await visit.update({ status: 'checked_in', check_in: new Date() });
    logger.info(`Check-in: visita ${visit.id}`);
    res.json({ visit });
  } catch (error) {
    next(error);
  }
}

async function checkOut(req, res, next) {
  try {
    const whereCO = { id: req.params.id };
    applyCompanyScope(whereCO, req);
    const visit = await Visit.findOne({ where: whereCO });

    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' });
    if (visit.status !== 'checked_in') return res.status(400).json({ error: 'La visita no tiene registro de entrada' });

    await visit.update({ status: 'checked_out', check_out: new Date() });
    logger.info(`Check-out: visita ${visit.id}`);

    notifyUser(
      visit.created_by,
      'Salida registrada',
      `${visit.visitor_name} ha salido de las instalaciones`,
      'success',
    );

    res.json({ visit });
  } catch (error) {
    next(error);
  }
}

async function getDestinations(req, res, next) {
  try {
    const whereDest = {};
    applyCompanyScope(whereDest, req);
    const destinations = await Visit.findAll({
      where: whereDest,
      attributes: [[Visit.sequelize.fn('DISTINCT', Visit.sequelize.col('destination')), 'destination']],
      order: [['destination', 'ASC']],
      raw: true,
    });
    res.json({ destinations: destinations.map((d) => d.destination) });
  } catch (error) {
    next(error);
  }
}

async function exportCSV(req, res, next) {
  try {
    const where = buildVisitExportWhere(req.query);
    applyCompanyScope(where, req);

    const visits = await Visit.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['full_name'] },
        { model: Company, as: 'company', attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true,
    });

    const headers = [
      'ID', 'Visitante', 'Documento', 'Empresa visitante', 'Email', 'Teléfono',
      'Destino', 'Persona visitada', 'Email visitado', 'Motivo', 'Matrícula',
      'Sede', 'Edificio', 'Empresa destino',
      'Estado', 'Entrada', 'Salida', 'Registrado por', 'Fecha creación',
    ];

    const rows = visits.map((v) => [
      v.id,
      `"${v.visitor_name}"`,
      `"${v.visitor_document}"`,
      `"${v.visitor_company || ''}"`,
      v.visitor_email || '',
      v.visitor_phone || '',
      `"${v.destination}"`,
      `"${v.host_name || ''}"`,
      v.host_email || '',
      `"${v.purpose}"`,
      v.vehicle_plate || '',
      v.site || '',
      v.building || '',
      `"${v.company?.name || ''}"`,
      STATUS_LABELS[v.status] || v.status,
      v.check_in ? new Date(v.check_in).toLocaleString('es-ES') : '',
      v.check_out ? new Date(v.check_out).toLocaleString('es-ES') : '',
      `"${v.creator?.full_name || ''}"`,
      new Date(v.created_at).toLocaleString('es-ES'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=visitas_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
}

async function exportExcel(req, res, next) {
  try {
    const where = buildVisitExportWhere(req.query);
    applyCompanyScope(where, req);
    const visits = await Visit.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['full_name'] },
        { model: Company, as: 'company', attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Registro de Visitas';
    const sheet = workbook.addWorksheet('Visitas', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.addRow([
      'ID', 'Visitante', 'Documento', 'Empresa visitante', 'Email', 'Teléfono',
      'Destino', 'Persona visitada', 'Email visitado', 'Motivo', 'Matrícula',
      'Sede', 'Edificio', 'Empresa destino',
      'Estado', 'Entrada', 'Salida', 'Registrado por', 'Fecha creación',
    ]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } };
    headerRow.alignment = { vertical: 'middle' };

    visits.forEach((v) => {
      sheet.addRow([
        v.id,
        v.visitor_name, v.visitor_document,
        v.visitor_company || '', v.visitor_email || '', v.visitor_phone || '',
        v.destination, v.host_name || '', v.host_email || '', v.purpose,
        v.vehicle_plate || '', v.site || '', v.building || '',
        v.company?.name || '',
        STATUS_LABELS[v.status] || v.status,
        v.check_in ? new Date(v.check_in).toLocaleString('es-ES') : '',
        v.check_out ? new Date(v.check_out).toLocaleString('es-ES') : '',
        v.creator?.full_name || '',
        new Date(v.created_at).toLocaleString('es-ES'),
      ]);
    });

    const widths = [8, 28, 16, 22, 24, 14, 22, 24, 24, 32, 14, 14, 14, 22, 18, 20, 20, 22, 20];
    sheet.columns.forEach((col, i) => { col.width = widths[i] || 16; });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=visitas_${dateStr}.xlsx`);
    await workbook.xlsx.write(res);
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, remove, checkIn, checkOut, getDestinations, exportCSV, exportExcel };
