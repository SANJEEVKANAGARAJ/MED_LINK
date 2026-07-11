const { errorResponse } = require('../utils/response');

const globalErrorHandler = (err, req, res, next) => {
  console.error('[Global Error]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = globalErrorHandler;
