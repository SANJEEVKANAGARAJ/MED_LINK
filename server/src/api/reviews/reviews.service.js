const db = require('../../db');

class ReviewsService {
  async submitReview(patientUserId, { appointment_id, rating, comment }) {
    // Get patient id
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [patientUserId]);
    if (patientResult.rowCount === 0) throw { statusCode: 404, message: 'Patient profile not found' };
    const patient_id = patientResult.rows[0].id;

    // Verify appointment belongs to this patient & is completed/booked
    const apptResult = await db.query(
      `SELECT a.id, a.doctor_id, a.status FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = $1 AND p.user_id = $2`,
      [appointment_id, patientUserId]
    );
    if (apptResult.rowCount === 0) throw { statusCode: 404, message: 'Appointment not found' };
    const appt = apptResult.rows[0];

    // Check duplicate
    const dupCheck = await db.query(
      'SELECT id FROM doctor_reviews WHERE appointment_id = $1',
      [appointment_id]
    );
    if (dupCheck.rowCount > 0) throw { statusCode: 409, message: 'You have already reviewed this appointment.' };

    const result = await db.query(
      `INSERT INTO doctor_reviews (appointment_id, patient_id, doctor_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [appointment_id, patient_id, appt.doctor_id, rating, comment || null]
    );
    return result.rows[0];
  }

  async getDoctorReviews(doctorId) {
    const result = await db.query(
      `SELECT dr.id, dr.rating, dr.comment, dr.created_at,
              p.first_name || ' ' || LEFT(p.last_name, 1) || '.' AS patient_name
       FROM doctor_reviews dr
       JOIN patients p ON dr.patient_id = p.id
       WHERE dr.doctor_id = $1
       ORDER BY dr.created_at DESC`,
      [doctorId]
    );
    const avgResult = await db.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS total FROM doctor_reviews WHERE doctor_id = $1',
      [doctorId]
    );
    return {
      reviews: result.rows,
      avg_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      total: parseInt(avgResult.rows[0].total),
    };
  }
}

module.exports = new ReviewsService();
