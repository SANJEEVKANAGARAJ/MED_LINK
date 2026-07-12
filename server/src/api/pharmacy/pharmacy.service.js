const bcrypt = require('bcrypt');
const db = require('../../db');
const { signAccessToken, signRefreshToken } = require('../../common/utils/jwt');

class PharmacyService {
  // ──────────── Auth ────────────
  async login(email, password) {
    const result = await db.query('SELECT * FROM pharmacies WHERE email = $1', [email]);
    if (result.rowCount === 0) throw { statusCode: 401, message: 'Invalid credentials' };
    const pharmacy = result.rows[0];
    const valid = await bcrypt.compare(password, pharmacy.password_hash);
    if (!valid) throw { statusCode: 401, message: 'Invalid credentials' };
    delete pharmacy.password_hash;
    // Embed role = 'pharmacy' in token
    const accessToken = signAccessToken({ id: pharmacy.id, role: 'pharmacy', email: pharmacy.email });
    const refreshToken = signRefreshToken({ id: pharmacy.id, role: 'pharmacy' });
    return { pharmacy, accessToken, refreshToken };
  }

  // ──────────── Medicines ────────────
  async getMedicines(pharmacyId) {
    const result = await db.query(
      'SELECT * FROM pharmacy_medicines WHERE pharmacy_id = $1 ORDER BY medicine_name',
      [pharmacyId]
    );
    return result.rows;
  }

  async updateMedicine(pharmacyId, medicineId, { price_usd, stock_qty }) {
    const result = await db.query(
      `UPDATE pharmacy_medicines SET price_usd = $1, stock_qty = $2
       WHERE id = $3 AND pharmacy_id = $4 RETURNING *`,
      [price_usd, stock_qty, medicineId, pharmacyId]
    );
    if (result.rowCount === 0) throw { statusCode: 404, message: 'Medicine not found' };
    return result.rows[0];
  }

  // ──────────── Marketplace (patient) ────────────
  async getMarketplaceForMedicine(medicineName) {
    // Returns all pharmacies that stock this medicine, sorted cheapest first
    const result = await db.query(
      `SELECT pm.id, pm.medicine_name, pm.price_usd, pm.stock_qty,
              p.id AS pharmacy_id, p.name AS pharmacy_name, p.address, p.phone
       FROM pharmacy_medicines pm
       JOIN pharmacies p ON pm.pharmacy_id = p.id
       WHERE LOWER(pm.medicine_name) LIKE LOWER($1) AND pm.stock_qty > 0
       ORDER BY pm.price_usd ASC`,
      [`%${medicineName}%`]
    );
    return result.rows;
  }

  async getAllMarketplaceMedicines() {
    // All distinct medicines across all pharmacies with price comparison
    const result = await db.query(
      `SELECT pm.medicine_name,
              json_agg(
                json_build_object(
                  'medicine_id', pm.id,
                  'pharmacy_id', p.id,
                  'pharmacy_name', p.name,
                  'address', p.address,
                  'phone', p.phone,
                  'price_usd', pm.price_usd,
                  'stock_qty', pm.stock_qty
                ) ORDER BY pm.price_usd ASC
              ) AS pharmacies
       FROM pharmacy_medicines pm
       JOIN pharmacies p ON pm.pharmacy_id = p.id
       WHERE pm.stock_qty > 0
       GROUP BY pm.medicine_name
       ORDER BY pm.medicine_name`
    );
    return result.rows;
  }

  // ──────────── Orders ────────────
  async getPharmacyOrders(pharmacyId) {
    const result = await db.query(
      `SELECT po.*, 
              p.first_name || ' ' || p.last_name AS patient_name,
              pu.email AS patient_email
       FROM pharmacy_orders po
       JOIN patients p ON po.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       WHERE po.pharmacy_id = $1
       ORDER BY po.created_at DESC`,
      [pharmacyId]
    );
    return result.rows;
  }

  async updateOrderDeliveryStatus(pharmacyId, orderId, delivery_status) {
    const validStatuses = ['pending', 'confirmed', 'dispatched', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(delivery_status)) {
      throw { statusCode: 400, message: 'Invalid delivery status' };
    }

    const orderCheck = await db.query(
      'SELECT * FROM pharmacy_orders WHERE id = $1 AND pharmacy_id = $2',
      [orderId, pharmacyId]
    );
    if (orderCheck.rowCount === 0) throw { statusCode: 404, message: 'Order not found' };

    const trackingUpdate = {
      status: delivery_status,
      timestamp: new Date().toISOString(),
      message: this._statusMessage(delivery_status),
    };

    const result = await db.query(
      `UPDATE pharmacy_orders 
       SET delivery_status = $1,
           tracking_updates = tracking_updates || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [delivery_status, JSON.stringify([trackingUpdate]), orderId]
    );
    return result.rows[0];
  }

  async getPatientOrders(patientUserId) {
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [patientUserId]);
    if (patientResult.rowCount === 0) return [];
    const patientId = patientResult.rows[0].id;

    const result = await db.query(
      `SELECT po.*, ph.name AS pharmacy_name, ph.address AS pharmacy_address, ph.phone AS pharmacy_phone
       FROM pharmacy_orders po
       JOIN pharmacies ph ON po.pharmacy_id = ph.id
       WHERE po.patient_id = $1
       ORDER BY po.created_at DESC`,
      [patientId]
    );
    return result.rows;
  }

  _statusMessage(status) {
    const msgs = {
      pending: 'Order received and pending confirmation.',
      confirmed: 'Order confirmed by pharmacy.',
      dispatched: 'Order has been dispatched.',
      out_for_delivery: 'Out for delivery – arriving soon!',
      delivered: 'Order delivered successfully.',
    };
    return msgs[status] || status;
  }
}

module.exports = new PharmacyService();
