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
const evacuationRoutes = require('./routes/evacuation');
const integrationsRoutes = require('./routes/integrations');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === '1' || trustProxy === 'true' || trustProxy === 'yes') {
  app.set('trust proxy', 1);
} else if (trustProxy && !Number.isNaN(Number(trustProxy))) {
  app.set('trust proxy', Number(trustProxy));
}

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' },
  standardHeaders: true, legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Demasiados intentos de login, intente de nuevo en 15 minutos' },
  standardHeaders: true, legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Demasiados intentos de registro, intenta de nuevo en 1 hora' },
  standardHeaders: true, legacyHeaders: false,
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
app.use('/api/evacuation', evacuationRoutes);
app.use('/api/integrations', integrationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(notFound);
app.use(errorHandler);

async function runPreAlters(isPg) {
  if (!isPg) return;

  // 1. Ampliar ENUM de roles (antes del sync)
  const enumAlters = [
    "ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'superadmin'",
    "ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'admin_empresa'",
  ];
  for (const sql of enumAlters) {
    try { await sequelize.query(sql); } catch (_) { /* enum no existe aún */ }
  }

  // 2. Columnas nuevas en visits
  const visitAlters = [
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS signature TEXT',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS host_name VARCHAR(100)',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS host_email VARCHAR(100)',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(20)',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS site VARCHAR(50)',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS building VARCHAR(50)',
    'ALTER TABLE visits ADD COLUMN IF NOT EXISTS company_id INTEGER',
  ];

  // 3. Columnas nuevas en users (antes del sync para que los índices no fallen)
  const userAlters = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS document_id VARCHAR(30)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS job_level VARCHAR(50)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(50)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS site VARCHAR(50)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS building VARCHAR(50)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_receive_visits BOOLEAN NOT NULL DEFAULT TRUE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_trigger_evacuation BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_present BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE',
  ];

  for (const sql of [...visitAlters, ...userAlters]) {
    try { await sequelize.query(sql + ';'); } catch (_) { /* tabla no existe aún */ }
  }
}

async function runPostAlters(isPg) {
  if (!isPg) return;

  const fkAlters = [
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name='users_company_id_fkey' AND table_name='users')
       THEN ALTER TABLE users ADD CONSTRAINT users_company_id_fkey
         FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
       END IF; END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name='visits_company_id_fkey' AND table_name='visits')
       THEN ALTER TABLE visits ADD CONSTRAINT visits_company_id_fkey
         FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE;
       END IF; END $$`,
    // Índices de visits nuevos
    'CREATE INDEX IF NOT EXISTS visits_vehicle_plate ON visits (vehicle_plate)',
    'CREATE INDEX IF NOT EXISTS visits_site ON visits (site)',
    'CREATE INDEX IF NOT EXISTS visits_building ON visits (building)',
    // Índices de users nuevos
    'CREATE INDEX IF NOT EXISTS users_is_present ON users (is_present)',
    'CREATE INDEX IF NOT EXISTS users_can_receive_visits ON users (can_receive_visits)',
  ];
  for (const sql of fkAlters) {
    try { await sequelize.query(sql); } catch (_) { /* ya existe */ }
  }

  const privacyAlters = [
    'ALTER TABLE users DROP COLUMN IF EXISTS dni',
    'ALTER TABLE visits ALTER COLUMN visitor_document DROP NOT NULL',
  ];
  for (const sql of privacyAlters) {
    try { await sequelize.query(sql); } catch (_) { /* columna ya ajustada o tabla distinta */ }
  }
}

async function startServer() {
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

    await runPreAlters(isPg);

    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('Modelos sincronizados con la base de datos');

    await runPostAlters(isPg);
  } catch (error) {
    logger.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
