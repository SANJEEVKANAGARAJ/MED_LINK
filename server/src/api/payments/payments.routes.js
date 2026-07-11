const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { authenticate, authorize } = require('../../common/middleware/auth.middleware');

// Create Stripe Checkout session (patient must be logged in + have a held slot)
router.post(
  '/create-session',
  authenticate,
  authorize('patient'),
  paymentsController.createSession.bind(paymentsController)
);

// Verify payment after Stripe redirects back (patient must be logged in)
router.get(
  '/verify',
  authenticate,
  authorize('patient'),
  paymentsController.verifySession.bind(paymentsController)
);

// Get payment info for an appointment (for invoice)
router.get(
  '/session/:appointmentId',
  authenticate,
  paymentsController.getPaymentByAppointment.bind(paymentsController)
);

module.exports = router;
