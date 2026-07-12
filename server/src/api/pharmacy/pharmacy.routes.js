const express = require('express');
const router = express.Router();
const pharmacyController = require('./pharmacy.controller');
const { authenticate } = require('../../common/middleware/auth.middleware');
const { errorResponse } = require('../../common/utils/response');

// Middleware: admin-only guard
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return errorResponse(res, 403, 'Admin access only.');
  next();
};

// ── Admin Pharmacy Management ──
router.get('/pharmacy/admin/list', authenticate, adminOnly, pharmacyController.adminListPharmacies.bind(pharmacyController));
router.post('/pharmacy/admin/create', authenticate, adminOnly, pharmacyController.adminCreatePharmacy.bind(pharmacyController));
router.put('/pharmacy/admin/:id', authenticate, adminOnly, pharmacyController.adminUpdatePharmacy.bind(pharmacyController));
router.delete('/pharmacy/admin/:id', authenticate, adminOnly, pharmacyController.adminDeletePharmacy.bind(pharmacyController));
router.get('/pharmacy/admin/:id/medicines', authenticate, adminOnly, pharmacyController.adminGetMedicines.bind(pharmacyController));
router.put('/pharmacy/admin/medicines/:id', authenticate, adminOnly, pharmacyController.adminUpdateMedicine.bind(pharmacyController));
router.put('/pharmacy/admin/:id/orders/:orderId/status', authenticate, adminOnly, pharmacyController.adminUpdateOrderStatus.bind(pharmacyController));

// ── Patient routes ──
router.get('/pharmacy/marketplace', authenticate, pharmacyController.getMarketplace.bind(pharmacyController));
router.post('/pharmacy/order-session', authenticate, pharmacyController.createOrderSession.bind(pharmacyController));
router.get('/pharmacy/verify-order', authenticate, pharmacyController.verifyOrder.bind(pharmacyController));
router.get('/pharmacy/my-orders', authenticate, pharmacyController.getMyOrders.bind(pharmacyController));

module.exports = router;
