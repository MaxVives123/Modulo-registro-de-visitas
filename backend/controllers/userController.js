const { User, Company } = require('../models');
const { isSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const USER_ATTRS = ['id', 'username', 'full_name', 'role', 'company_id', 'active', 'createdAt'];

async function list(req, res, next) {
  try {
    const where = { active: true };

    if (isSuperAdmin(req.user.role)) {
      // superadmin ve todos los usuarios (activos e inactivos)
      delete where.active;
    } else {
      // admin_empresa ve solo los de su empresa (activos e inactivos)
      where.company_id = req.user.company_id;
      delete where.active;
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
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

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
    const { username, password, full_name, role } = req.body;
    const callerRole = req.user.role;

    // Determinar empresa del nuevo usuario
    let companyId;
    if (isSuperAdmin(callerRole)) {
      companyId = req.body.company_id ? parseInt(req.body.company_id, 10) : null;
    } else {
      // admin_empresa solo puede crear usuarios en su propia empresa
      companyId = req.user.company_id;
    }

    // Restricción de roles asignables
    let assignedRole = role || 'user';
    if (!isSuperAdmin(callerRole)) {
      // admin_empresa solo puede crear 'user' o 'admin_empresa'
      if (!['user', 'admin_empresa'].includes(assignedRole)) {
        assignedRole = 'user';
      }
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }

    const user = await User.create({
      username,
      password,
      full_name,
      role: assignedRole,
      company_id: companyId,
      active: true,
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
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { full_name, role, active } = req.body;
    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name;

    if (role !== undefined) {
      // admin_empresa no puede escalar a superadmin
      if (!isSuperAdmin(req.user.role) && isSuperAdmin(role)) {
        return res.status(403).json({ error: 'No puedes asignar ese rol' });
      }
      updates.role = role;
    }

    if (active !== undefined) {
      if (user.id === req.user.id && !active) {
        return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
      }
      updates.active = active;
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
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

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
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

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
