const { User, Company } = require('../models');
const { isSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const USER_ATTRS = [
  'id', 'username', 'full_name', 'role', 'company_id', 'active',
  'phone', 'email', 'dni', 'job_level', 'job_title', 'department',
  'site', 'building', 'can_receive_visits', 'can_trigger_evacuation',
  'is_present', 'last_access_at', 'createdAt',
];

async function list(req, res, next) {
  try {
    const where = {};
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

    const users = await User.findAll({
      where,
      attributes: USER_ATTRS,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({
      where,
      attributes: USER_ATTRS,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const {
      username, password, full_name, role,
      phone, email, dni, job_level, job_title, department,
      site, building, can_receive_visits, can_trigger_evacuation,
    } = req.body;
    const callerRole = req.user.role;

    let companyId;
    if (isSuperAdmin(callerRole)) {
      companyId = req.body.company_id ? parseInt(req.body.company_id, 10) : null;
    } else {
      companyId = req.user.company_id;
    }

    let assignedRole = role || 'user';
    if (!isSuperAdmin(callerRole)) {
      if (!['user', 'admin_empresa'].includes(assignedRole)) assignedRole = 'user';
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

    // Solo superadmin puede asignar can_trigger_evacuation
    const canTriggerEvac = isSuperAdmin(callerRole)
      ? (can_trigger_evacuation ?? false)
      : false;

    const user = await User.create({
      username, password, full_name,
      role: assignedRole,
      company_id: companyId,
      active: true,
      phone: phone || null,
      email: email || null,
      dni: dni || null,
      job_level: job_level || null,
      job_title: job_title || null,
      department: department || null,
      site: site || null,
      building: building || null,
      can_receive_visits: can_receive_visits !== undefined ? Boolean(can_receive_visits) : true,
      can_trigger_evacuation: canTriggerEvac,
    });

    logger.info(`Usuario creado: ${username} (role: ${assignedRole}, company: ${companyId ?? 'global'}) por ${req.user.username}`);
    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const updates = {};
    const allowed = [
      'full_name', 'phone', 'email', 'dni', 'job_level', 'job_title',
      'department', 'site', 'building', 'can_receive_visits',
    ];
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.body.role !== undefined) {
      if (!isSuperAdmin(req.user.role) && isSuperAdmin(req.body.role)) {
        return res.status(403).json({ error: 'No puedes asignar ese rol' });
      }
      updates.role = req.body.role;
    }

    if (req.body.active !== undefined) {
      if (user.id === req.user.id && !req.body.active) {
        return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
      }
      updates.active = req.body.active;
    }

    // Solo superadmin puede cambiar can_trigger_evacuation
    if (req.body.can_trigger_evacuation !== undefined && isSuperAdmin(req.user.role)) {
      updates.can_trigger_evacuation = Boolean(req.body.can_trigger_evacuation);
    }

    await user.update(updates);
    logger.info(`Usuario actualizado: ${user.username} por ${req.user.username}`);
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.password = req.body.password;
    await user.save();

    logger.info(`Contraseña cambiada para: ${user.username} por ${req.user.username}`);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    await user.update({ active: false });
    logger.info(`Usuario desactivado: ${user.username} por ${req.user.username}`);
    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, changePassword, remove };
