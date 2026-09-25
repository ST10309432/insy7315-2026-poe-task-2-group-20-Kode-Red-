const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { query } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy (needed for rate limiting by IP)
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: false, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// GET /api/health  -> used by Render health checks and to wake the free instance
app.get('/api/health', async (req, res) => {
  let database = 'up';
  try { await query('SELECT 1'); } catch { database = 'down'; }
  res.status(database === 'up' ? 200 : 503).json({ data: { status: 'ok', database, time: new Date().toISOString() } });
});

// Interactive API documentation (Swagger UI) at /api/docs, raw spec at /api/openapi.json
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
app.get('/api/openapi.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'Thabang Phala API docs',
  swaggerOptions: { persistAuthorization: true, tryItOutEnabled: true },
}));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/truck', require('./routes/truckRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api', require('./routes/publicRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
