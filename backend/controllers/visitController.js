const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Visit, User } = require('../models');
const logger = require('../utils/logger');
const { notifyAdmins, notifyUser } = require('./notificationController');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      where[Op.or] = [
        { visitor_name: { [Op.iLike]: search } },
        { visitor_document: { [Op.iLike]: search } },
        { visitor_company: { [Op.iLike]: search } },
        { destination: { [Op.iLike]: search } },
        { purpose: { [Op.iLike]: search } },
      ];
    }

    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) {
        where.created_at[Op.gte] = new Date(req.query.date_from);
      }
      if (req.query.date_to) {
        const dateTo = new Date(req.query.date_to);
        dateTo.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = dateTo;
      }
    }

    if (req.query.destination) {
      where.destination = req.query.destination;
    }

    const { rows: visits, count: total } = await Visit.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      visits,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] }],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    res.json({ visit });
  } catch (error) {
    next(error);
  }
}

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
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
      qr_code: qrCode,
      status: 'checked_in',
      check_in: new Date(),
      created_by: req.user.id,
    });

    const fullVisit = await Visit.findByPk(visit.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] }],
    });

    logger.info(`Visita creada: ${visit.id} - ${visit.visitor_name}`);

    notifyAdmins(
      'Nueva visita',
      `${visit.visitor_name} → ${visit.destination}`,
      'info',
    );

    res.status(201).json({ visit: fullVisit });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const allowedFields = [
      'visitor_name', 'visitor_document', 'visitor_company',
      'visitor_email', 'visitor_phone', 'destination', 'purpose', 'notes', 'signature',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await visit.update(updates);

    const fullVisit = await Visit.findByPk(visit.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'username'] }],
    });

    logger.info(`Visita actualizada: ${visit.id}`);
    res.json({ visit: fullVisit });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    await visit.destroy();
    logger.info(`Visita eliminada: ${req.params.id}`);
    res.json({ message: 'Visita eliminada correctamente' });
  } catch (error) {
    next(error);
  }
}

async function checkIn(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    if (visit.status !== 'pending') {
      return res.status(400).json({ error: 'La visita no está en estado pendiente' });
    }

    await visit.update({ status: 'checked_in', check_in: new Date() });
    logger.info(`Check-in: visita ${visit.id}`);
    res.json({ visit });
  } catch (error) {
    next(error);
  }
}

async function checkOut(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    if (visit.status !== 'checked_in') {
      return res.status(400).json({ error: 'La visita no tiene registro de entrada' });
    }

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
    const destinations = await Visit.findAll({
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
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) where.created_at[Op.gte] = new Date(req.query.date_from);
      if (req.query.date_to) {
        const dateTo = new Date(req.query.date_to);
        dateTo.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = dateTo;
      }
    }

    const visits = await Visit.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['full_name'] }],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true,
    });

    const headers = [
      'ID', 'Visitante', 'Documento', 'Empresa', 'Email', 'Teléfono',
      'Destino', 'Motivo', 'Estado', 'Entrada', 'Salida', 'Registrado por', 'Fecha creación',
    ];

    const statusLabels = {
      pending: 'Pendiente',
      checked_in: 'En instalaciones',
      checked_out: 'Salida registrada',
      cancelled: 'Cancelada',
    };

    const rows = visits.map((v) => [
      v.id,
      `"${v.visitor_name}"`,
      `"${v.visitor_document}"`,
      `"${v.visitor_company || ''}"`,
      v.visitor_email || '',
      v.visitor_phone || '',
      `"${v.destination}"`,
      `"${v.purpose}"`,
      statusLabels[v.status] || v.status,
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

module.exports = { list, getById, create, update, remove, checkIn, checkOut, getDestinations, exportCSV };
