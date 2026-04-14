const { Company } = require('../models');
const logger = require('../utils/logger');

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function list(req, res, next) {
  try {
    const where = {};
    if (req.query.active !== undefined && req.query.active !== '') {
      where.active = req.query.active === 'true';
    }
    const companies = await Company.findAll({
      where,
      order: [['name', 'ASC']],
    });
    res.json({ companies });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    res.json({ company });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const company = await Company.create({
      name: req.body.name,
      rif: nullIfEmpty(req.body.rif),
      address: nullIfEmpty(req.body.address),
      phone: nullIfEmpty(req.body.phone),
      email: nullIfEmpty(req.body.email),
    });
    logger.info(`Empresa creada: ${company.id} - ${company.name}`);
    res.status(201).json({ company });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const allowedFields = ['name', 'rif', 'address', 'phone', 'email', 'active'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'active' ? Boolean(req.body[field]) : req.body[field];
      }
    });

    await company.update(updates);
    logger.info(`Empresa actualizada: ${company.id}`);
    res.json({ company });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    await company.update({ active: false });
    logger.info(`Empresa desactivada: ${company.id}`);
    res.json({ message: 'Empresa desactivada correctamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, remove };
