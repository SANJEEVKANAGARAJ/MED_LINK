const { errorResponse } = require('../utils/response');

/**
 * Middleware to validate request body, query, or params using Zod
 * @param {Object} schema - Zod schema
 * @param {String} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const issues = error.errors || error.issues || [];
        const errors = issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errorResponse(res, 400, 'Validation failed', errors);
      }
      next(error);
    }
  };
};

module.exports = validate;
