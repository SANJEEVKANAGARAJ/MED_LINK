const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate a user via JWT Access Token
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // Attach user info to request (id, role)
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expired.');
    }
    return errorResponse(res, 401, 'Invalid token.');
  }
};

/**
 * Middleware to authorize specific roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'doctor', 'patient')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Forbidden. You do not have permission to access this resource.');
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
