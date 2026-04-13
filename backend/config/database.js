const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const pool = {
  max: 10,
  min: 2,
  acquire: 30000,
  idle: 10000,
};

const define = {
  timestamps: true,
  underscored: true,
};

const logging = process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false;

/** Railway/Render suelen exponer DATABASE_URL; Docker local usa DB_* por separado. */
function createSequelize() {
  if (process.env.DATABASE_URL) {
    const dialectOptions = {};
    // Railway suele incluir ssl en la URL; forzar SSL extra a veces rompe la conexión.
    const urlHasSsl = /sslmode|ssl=true/i.test(process.env.DATABASE_URL);
    const wantSsl = process.env.DATABASE_SSL === 'true' || (process.env.DATABASE_SSL !== 'false' && !urlHasSsl);
    if (wantSsl) {
      dialectOptions.ssl = { require: true, rejectUnauthorized: false };
    }
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging,
      pool,
      define,
      dialectOptions: Object.keys(dialectOptions).length ? dialectOptions : undefined,
    });
  }

  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialect: 'postgres',
      logging,
      pool,
      define,
    }
  );
}

const sequelize = createSequelize();

async function connectDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('Conexión a PostgreSQL establecida correctamente');
      return;
    } catch (error) {
      logger.warn(`Intento ${i + 1}/${retries} - Error conectando a DB: ${error.message}`);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  logger.error('No se pudo conectar a la base de datos después de múltiples intentos');
  process.exit(1);
}

module.exports = { sequelize, connectDB };
