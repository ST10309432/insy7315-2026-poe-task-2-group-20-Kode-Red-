const AppError = require('../utils/AppError');

function notFound(req, res) {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.originalUrl} not found` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  // Postgres constraint errors -> friendly messages
  if (err.code === '23505') return res.status(409).json({ error: { message: 'That record already exists', details: err.detail } });
  if (err.code === '23503') return res.status(409).json({ error: { message: 'That record is still in use or references something missing' } });
  if (err.code === '23514') return res.status(422).json({ error: { message: 'That change breaks a business rule', details: err.constraint } });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: { message: 'That upload is too large' } });

  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong on our side. Please try again.' } });
}

module.exports = { notFound, errorHandler };
