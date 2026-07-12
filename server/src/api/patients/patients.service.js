const db = require('../../db');

class PatientsService {
  async searchPatients(query) {
    let sql = `
      SELECT p.id, p.user_id, p.first_name, p.last_name, p.date_of_birth, p.phone_number, u.email, u.profile_image_url
      FROM patients p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [];

    if (query) {
      sql += ` WHERE p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR u.email ILIKE $1`;
      params.push(`%${query}%`);
    }

    sql += ' ORDER BY p.last_name ASC, p.first_name ASC';

    const result = await db.query(sql, params);
    return result.rows;
  }

  async getPatientById(id) {
    const result = await db.query(
      `SELECT p.id, p.user_id, p.first_name, p.last_name, p.date_of_birth, p.phone_number, u.email, u.profile_image_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Patient not found' };
    }
    return result.rows[0];
  }

  async getPatientByUserId(userId) {
    const result = await db.query(
      `SELECT p.id, p.user_id, p.first_name, p.last_name, p.date_of_birth, p.phone_number, u.email, u.profile_image_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Patient profile not found' };
    }
    return result.rows[0];
  }

  async updatePatient(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) {
      throw { statusCode: 400, message: 'No fields provided for update' };
    }

    values.push(id);
    const query = `UPDATE patients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    
    const result = await db.query(query, values);
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Patient not found' };
    }
    return result.rows[0];
  }

  async getPatientHistory(id) {
    // Combine appointments, prescriptions, and AI summaries for the patient
    const query = `
      SELECT 
        a.id AS appointment_id,
        a.appointment_date,
        a.slot_time,
        a.status,
        d.first_name AS doctor_first_name,
        d.last_name AS doctor_last_name,
        d.specialisation AS doctor_specialisation,
        s.raw_symptoms,
        aipre.urgency_level,
        aipre.chief_complaint,
        aipre.suggested_questions,
        aipost.patient_friendly_summary,
        aipost.medication_schedule,
        aipost.follow_up_instructions,
        pr.clinical_notes AS prescription_notes,
        pr.id AS prescription_id,
        pr.medications AS medications
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN symptoms s ON a.id = s.appointment_id
      LEFT JOIN ai_summaries aipre ON a.id = aipre.appointment_id AND aipre.summary_type = 'pre_visit'
      LEFT JOIN ai_summaries aipost ON a.id = aipost.appointment_id AND aipost.summary_type = 'post_visit'
      LEFT JOIN prescriptions pr ON a.id = pr.appointment_id
      WHERE a.patient_id = $1 AND a.status IN ('completed', 'cancelled')
      ORDER BY a.appointment_date DESC, a.created_at DESC
    `;
    
    const result = await db.query(query, [id]);
    return result.rows;
  }

  async getAppointmentSymptomsForDoctor(appointmentId) {
    // Fetch symptoms and AI pre-visit summary for a specific appointment regardless of status.
    // Used by the doctor during a visit to view the patient's pre-visit AI analysis.
    const query = `
      SELECT 
        a.id AS appointment_id,
        s.raw_symptoms,
        aipre.urgency_level,
        aipre.chief_complaint,
        aipre.suggested_questions
      FROM appointments a
      LEFT JOIN symptoms s ON a.id = s.appointment_id
      LEFT JOIN ai_summaries aipre ON a.id = aipre.appointment_id AND aipre.summary_type = 'pre_visit'
      WHERE a.id = $1
    `;
    const result = await db.query(query, [appointmentId]);
    return result.rows[0] || null;
  }
}

module.exports = new PatientsService();

