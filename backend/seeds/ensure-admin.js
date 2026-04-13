/**
 * Idempotente: solo crea admin + recepción si no hay usuarios.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User } = require('../models');
const logger = require('../utils/logger');

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const n = await User.count();
    if (n > 0) {
      logger.info(`ensure-admin: ya existen ${n} usuario(s), no se hace nada`);
      process.exit(0);
      return;
    }

    await User.create({
      username: 'admin',
      password: 'admin123',
      full_name: 'Administrador del Sistema',
      role: 'admin',
      active: true,
    });
    await User.create({
      username: 'recepcion',
      password: 'recepcion123',
      full_name: 'Recepción Principal',
      role: 'user',
      active: true,
    });

    logger.info('ensure-admin: creados admin/admin123 y recepcion/recepcion123');
    process.exit(0);
  } catch (e) {
    logger.error('ensure-admin:', e);
    process.exit(1);
  }
}

main();
