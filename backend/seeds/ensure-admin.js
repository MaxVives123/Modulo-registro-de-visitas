/**
 * Idempotente: solo crea superadmin global si no existe ninguno.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User } = require('../models');
const logger = require('../utils/logger');

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const superAdminExists = await User.findOne({
      where: { role: ['superadmin', 'admin'] },
    });

    if (superAdminExists) {
      logger.info(`ensure-admin: ya existe un administrador global (${superAdminExists.username}), no se hace nada`);
      process.exit(0);
      return;
    }

    await User.create({
      username: 'superadmin',
      password: 'admin123',
      full_name: 'Administrador Global',
      role: 'superadmin',
      company_id: null,
      active: true,
    });

    logger.info('ensure-admin: creado superadmin/admin123 (sin empresa — acceso global)');
    process.exit(0);
  } catch (e) {
    logger.error('ensure-admin:', e);
    process.exit(1);
  }
}

main();
