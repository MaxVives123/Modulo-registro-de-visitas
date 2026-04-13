const { User } = require('../models');
const logger = require('../utils/logger');

async function list(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'full_name', 'role', 'active', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'full_name', 'role', 'active', 'createdAt'],
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

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }

    const user = await User.create({
      username,
      password,
      full_name,
      role: role || 'user',
      active: true,
    });

    logger.info(`Usuario creado: ${username} por ${req.user.username}`);
    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { full_name, role, active } = req.body;
    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;

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
    const user = await User.findByPk(req.params.id);
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
    const user = await User.findByPk(req.params.id);
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
