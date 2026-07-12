const express = require('express');
const router = express.Router();
const pharmacyController = require('./pharmacy.controller');
const { authenticate } = require('../../common/middleware/auth.middleware');
const { verifyAccessToken } = require('../../common/utils/jwt');
const { errorResponse } = require('../../common/utils/response');

// Middleware: verify pharmacy JWT token specifically
const pharmacyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Access denied. No token provided.');
  }
  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    if (decoded.role !== 'pharmacy') return errorResponse(res, 403, 'Forbidden: pharmacy access only.');
    req.user = decoded;
    next();
  } catch {
    return errorResponse(res, 401, 'Invalid or expired token.');
  }
};

// ── Public ──
router.post('/pharmacy/login', pharmacyController.login.bind(pharmacyController));

// ── Pharmacy portal (pharmacy JWT) ──
router.get('/pharmacy/medicines', pharmacyAuth, pharmacyController.getMedicines.bind(pharmacyController));
router.put('/pharmacy/medicines/:id', pharmacyAuth, pharmacyController.updateMedicine.bind(pharmacyController));
router.get('/pharmacy/orders', pharmacyAuth, pharmacyController.getOrders.bind(pharmacyController));
router.put('/pharmacy/orders/:id/status', pharmacyAuth, pharmacyController.updateOrderStatus.bind(pharmacyController));

// ── Patient routes ──
router.get('/pharmacy/marketplace', authenticate, pharmacyController.getMarketplace.bind(pharmacyController));
router.post('/pharmacy/order-session', authenticate, pharmacyController.createOrderSession.bind(pharmacyController));
router.get('/pharmacy/verify-order', authenticate, pharmacyController.verifyOrder.bind(pharmacyController));
router.get('/pharmacy/my-orders', authenticate, pharmacyController.getMyOrders.bind(pharmacyController));

module.exports = router;
