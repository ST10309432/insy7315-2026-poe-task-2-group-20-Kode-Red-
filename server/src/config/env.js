require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/thabang',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m', // NFR-21: 30 minute session
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
