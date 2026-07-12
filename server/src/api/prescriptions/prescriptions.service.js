const db = require('../../db');
const { enqueueEmail } = require('../email/emailQueue.service');
const { getPrescriptionTemplate } = require('../email/email.templates');

class PrescriptionsService {
  async createPrescription(appointmentId, doctorId, patientId, clinicalNotes, medications) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, clinical_notes, medications)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [appointmentId, doctorId, patientId, clinicalNotes, JSON.stringify(medications)]);

      const prescription = result.rows[0];

      // Parse frequencies and generate reminders
      // Assume medication format: { name: 'Amoxicillin', frequency: 'twice_daily', durationDays: 7 }
      // Valid frequencies: 'daily', 'twice_daily', 'thrice_daily', 'weekly'
      const reminders = [];
      const now = new Date();
      
      let baseTime = new Date();
      baseTime.setDate(baseTime.getDate() + 1);
      baseTime.setHours(9, 0, 0, 0);

      for (const med of medications) {
        let timesPerDay = 1;
        let dayInterval = 1;

        if (med.frequency === 'twice_daily') timesPerDay = 2;
        if (med.frequency === 'thrice_daily') timesPerDay = 3;
        if (med.frequency === 'weekly') dayInterval = 7;

        for (let day = 0; day < med.durationDays; day += dayInterval) {
          for (let timeIdx = 0; timeIdx < timesPerDay; timeIdx++) {
            const scheduledFor = new Date(baseTime);
            scheduledFor.setDate(scheduledFor.getDate() + day);
            
            // Distribute times across the day: 9 AM, 2 PM, 8 PM
            if (timeIdx === 1) scheduledFor.setHours(14, 0, 0, 0);
            if (timeIdx === 2) scheduledFor.setHours(20, 0, 0, 0);

            reminders.push({
              prescription_id: prescription.id,
              patient_id: patientId,
              scheduled_for: scheduledFor
            });
          }
        }
      }

      for (const r of reminders) {
        await client.query(`
          INSERT INTO medication_reminders (prescription_id, patient_id, scheduled_for)
          VALUES ($1, $2, $3)
        `, [r.prescription_id, r.patient_id, r.scheduled_for]);
      }

      await client.query('COMMIT');

      // Send email notification to patient
      try {
        const patientInfo = await db.query(
          `SELECT u.email, p.first_name, p.last_name
           FROM patients p JOIN users u ON p.user_id = u.id
           WHERE p.id = $1`, [patientId]
        );
        const doctorInfo = await db.query(
          `SELECT d.first_name, d.last_name
           FROM doctors d WHERE d.id = $1`, [doctorId]
        );
        if (patientInfo.rowCount > 0 && doctorInfo.rowCount > 0) {
          const pt = patientInfo.rows[0];
          const dr = doctorInfo.rows[0];
          const patientName = `${pt.first_name} ${pt.last_name}`;
          const doctorName = `${dr.first_name} ${dr.last_name}`;
          await enqueueEmail(
            pt.email,
            `New Prescription from Dr. ${doctorName}`,
            getPrescriptionTemplate(patientName, doctorName, clinicalNotes, medications)
          );
        }
      } catch (emailErr) {
        console.error('Prescription email notification failed (non-critical):', emailErr.message);
      }

      return prescription;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new PrescriptionsService();
