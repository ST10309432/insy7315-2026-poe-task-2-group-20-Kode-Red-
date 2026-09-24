const AppError = require('../utils/AppError');

/**
 * Validate req[source] against a zod schema and replace it with the parsed value.
 * Usage: router.post('/', validate(schema), handler)
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    return next(AppError.badRequest('Please check the highlighted fields', details));
  }
  if (source === 'query') req.validQuery = result.data; // req.query is read-only in Express 5
  else req[source] = result.data;
  next();
};

module.exports = validate;
