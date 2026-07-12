const pharmacyService = require('./pharmacy.service');
const { successResponse } = require('../../common/utils/response');
const db = require('../../db');
const Stripe = require('stripe');

const getStripe = () => Stripe(process.env.STRIPE_SECRET_KEY);

class PharmacyController {
  // POST /api/pharmacy/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const data = await pharmacyService.login(email, password);
      return successResponse(res, 200, 'Pharmacy login successful', data);
    } catch (error) { next(error); }
  }

  // GET /api/pharmacy/medicines  (pharmacy auth)
  async getMedicines(req, res, next) {
    try {
      const medicines = await pharmacyService.getMedicines(req.user.id);
      return successResponse(res, 200, 'Medicines fetched', medicines);
    } catch (error) { next(error); }
  }

  // PUT /api/pharmacy/medicines/:id  (pharmacy auth)
  async updateMedicine(req, res, next) {
    try {
      const med = await pharmacyService.updateMedicine(req.user.id, req.params.id, req.body);
      return successResponse(res, 200, 'Medicine updated', med);
    } catch (error) { next(error); }
  }

  // GET /api/pharmacy/orders  (pharmacy auth)
  async getOrders(req, res, next) {
    try {
      const orders = await pharmacyService.getPharmacyOrders(req.user.id);
      return successResponse(res, 200, 'Orders fetched', orders);
    } catch (error) { next(error); }
  }

  // PUT /api/pharmacy/orders/:id/status  (pharmacy auth)
  async updateOrderStatus(req, res, next) {
    try {
      const order = await pharmacyService.updateOrderDeliveryStatus(req.user.id, req.params.id, req.body.delivery_status);
      return successResponse(res, 200, 'Order status updated', order);
    } catch (error) { next(error); }
  }

  // GET /api/pharmacy/marketplace  (patient auth) — all medicines grouped
  async getMarketplace(req, res, next) {
    try {
      const data = await pharmacyService.getAllMarketplaceMedicines();
      return successResponse(res, 200, 'Marketplace fetched', data);
    } catch (error) { next(error); }
  }

  // POST /api/pharmacy/order-session  (patient auth) — create Stripe checkout for medicine
  async createOrderSession(req, res, next) {
    try {
      const { pharmacy_id, medicine_id, medicine_name, price_usd, qty, shipping_address, prescription_id } = req.body;
      const patientUserId = req.user.id;

      const patientResult = await db.query('SELECT id, first_name, last_name FROM patients WHERE user_id = $1', [patientUserId]);
      if (patientResult.rowCount === 0) return res.status(404).json({ message: 'Patient not found' });
      const patient = patientResult.rows[0];

      const pharmacyResult = await db.query('SELECT name FROM pharmacies WHERE id = $1', [pharmacy_id]);
      if (pharmacyResult.rowCount === 0) return res.status(404).json({ message: 'Pharmacy not found' });
      const pharmacy = pharmacyResult.rows[0];

      const totalCents = Math.round(parseFloat(price_usd) * qty * 100);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create Stripe Checkout session
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${medicine_name} × ${qty}`,
              description: `From ${pharmacy.name}`,
            },
            unit_amount: Math.round(parseFloat(price_usd) * 100),
          },
          quantity: qty,
        }],
        customer_email: req.user.email,
        success_url: `${frontendUrl}/patient/orders?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/patient/pharmacy`,
        metadata: {
          patient_id: patient.id,
          pharmacy_id,
          medicine_name,
          qty,
          prescription_id: prescription_id || '',
          shipping_address: shipping_address || '',
        },
      });

      // Persist pending order
      await db.query(
        `INSERT INTO pharmacy_orders 
           (prescription_id, patient_id, pharmacy_id, medicine_name, qty, total_price_usd, stripe_session_id, shipping_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [prescription_id || null, patient.id, pharmacy_id, medicine_name, qty,
         (parseFloat(price_usd) * qty).toFixed(2), session.id, shipping_address || '']
      );

      return successResponse(res, 200, 'Checkout session created', { url: session.url, session_id: session.id });
    } catch (error) { next(error); }
  }

  // GET /api/pharmacy/verify-order?session_id=  (patient auth)
  async verifyOrder(req, res, next) {
    try {
      const { session_id } = req.query;
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      if (session.payment_status === 'paid') {
        const tracking = [{
          status: 'pending',
          timestamp: new Date().toISOString(),
          message: 'Order received and pending confirmation.',
        }];
        await db.query(
          `UPDATE pharmacy_orders SET payment_status = 'paid',
           delivery_status = 'pending',
           tracking_updates = $1::jsonb
           WHERE stripe_session_id = $2`,
          [JSON.stringify(tracking), session_id]
        );
        const order = await db.query(
          'SELECT * FROM pharmacy_orders WHERE stripe_session_id = $1', [session_id]
        );
        return successResponse(res, 200, 'Payment verified', order.rows[0]);
      }
      return successResponse(res, 200, 'Payment not completed', null);
    } catch (error) { next(error); }
  }

  // GET /api/pharmacy/my-orders  (patient auth)
  async getMyOrders(req, res, next) {
    try {
      const orders = await pharmacyService.getPatientOrders(req.user.id);
      return successResponse(res, 200, 'Your orders', orders);
    } catch (error) { next(error); }
  }
}

module.exports = new PharmacyController();
