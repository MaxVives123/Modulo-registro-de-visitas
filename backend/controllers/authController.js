const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username, active: true } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logger.info(`Login exitoso: ${username}`);
    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, me };
