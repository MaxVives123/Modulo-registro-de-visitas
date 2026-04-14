require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/database');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const visitRoutes = require('./routes/visits');
const dashboardRoutes = require('./routes/dashboard');
const qrRoutes = require('./routes/qr');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const companyRoutes = require('./routes/companies');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Tras un proxy inverso o túnel (Cloudflare, nginx): permite req.ip y rate-limit correctos por cliente.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === '1' || trustProxy === 'true' || trustProxy === 'yes') {
  app.set('trust proxy', 1);
} else if (trustProxy && !Number.isNaN(Number(trustProxy))) {
  app.set('trust proxy', Number(trustProxy));
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login, intente de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de registro, intenta de nuevo en 1 hora' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register-company', registerLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/companies', companyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  // Escuchar antes de la BD: Railway healthcheck pega a /api/health mientras Postgres enlaza.
  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Servidor escuchando en http://${HOST}:${PORT}`);
      logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
      resolve();
    });
    server.on('error', reject);
  });

  try {
    await connectDB();
    const isPg = sequelize.getDialect() === 'postgres';

    if (isPg) {
      // Ampliar ENUM de roles antes del sync (idempotente con try-catch)
      const enumAlters = [
        "ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'superadmin'",
        "ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'admin_empresa'",
      ];
      for (const sql of enumAlters) {
        try { await sequelize.query(sql); } catch (_) { /* enum aún no existe, sync la crea */ }
      }
    }

    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('Modelos sincronizados con la base de datos');

    if (isPg) {
      // Columnas en visits (idempotentes)
      await sequelize.query('ALTER TABLE visits ADD COLUMN IF NOT EXISTS signature TEXT;');
      await sequelize.query('ALTER TABLE visits ADD COLUMN IF NOT EXISTS host_name VARCHAR(100);');
      await sequelize.query('ALTER TABLE visits ADD COLUMN IF NOT EXISTS host_email VARCHAR(100);');
      await sequelize.query('ALTER TABLE visits ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE;');
      // company_id en users (companies ya existe tras el sync)
      await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;');
    }
  } catch (error) {
    logger.error('Error al conectar o sincronizar la base de datos:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
