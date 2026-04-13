const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const pool = {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000,
};

const define = {
  timestamps: true,
  underscored: true,
};

const logging = process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false;

function formatDbError(error) {
  const msg = [
    error?.message,
    error?.parent?.message,
    error?.original?.message,
  ].filter(Boolean);
  const text = msg.length ? msg.join(' | ') : '';
  const code = error?.parent?.code || error?.original?.code || error?.code || '';
  const suffix = code ? ` [${code}]` : '';
  return (text || 'sin mensaje') + suffix;
}

/** SSL: red privada Railway (*.railway.internal) suele ir sin capa SSL extra en Sequelize. */
function dialectOptionsForDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return undefined;
  if (process.env.DATABASE_SSL === 'false') return undefined;
  if (process.env.DATABASE_SSL === 'true') {
    return { ssl: { require: true, rejectUnauthorized: false } };
  }
  try {
    const normalized = databaseUrl.replace(/^postgresql:/, 'http:');
    const { hostname } = new URL(normalized);
    if (hostname.includes('railway.internal')) {
      return undefined;
    }
  } catch (_) {
    /* ignore */
  }
  if (/sslmode=require|ssl=true/i.test(databaseUrl)) {
    return undefined;
  }
  return { ssl: { require: true, rejectUnauthorized: false } };
}

/** Railway/Render suelen exponer DATABASE_URL; Docker local usa DB_* por separado. */
function createSequelize() {
  if (process.env.DATABASE_URL) {
    const dialectOptions = dialectOptionsForDatabaseUrl(process.env.DATABASE_URL);
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging,
      pool,
      define,
      dialectOptions: dialectOptions || undefined,
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

async function connectDB(retries = 20, delay = 3000) {
  if (process.env.DATABASE_URL) {
    logger.info('DATABASE_URL está definida (conexión a PostgreSQL)');
  } else if (process.env.DB_HOST && process.env.DB_NAME) {
    logger.info(`Conexión DB por DB_HOST=${process.env.DB_HOST}`);
  } else {
    logger.error(
      'Falta DATABASE_URL o el conjunto DB_HOST + DB_NAME + DB_USER + DB_PASSWORD. En Railway: en el servicio web, Variables → referencia la variable DATABASE_URL del plugin PostgreSQL.'
    );
    process.exit(1);
  }

  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('Conexión a PostgreSQL establecida correctamente');
      return;
    } catch (error) {
      logger.warn(`Intento ${i + 1}/${retries} - Error conectando a DB: ${formatDbError(error)}`);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  logger.error('No se pudo conectar a la base de datos después de múltiples intentos');
  process.exit(1);
}

module.exports = { sequelize, connectDB };
