const db = require('../../db');
const { enqueueEmail } = require('../email/emailQueue.service');
const { getMedicationReminderTemplate } = require('../email/email.templates');

class RemindersService {
  async processDueReminders() {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        SELECT mr.id, mr.patient_id, u.email, p.first_name, p.last_name, pr.medications
        FROM medication_reminders mr
        JOIN patients p ON mr.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN prescriptions pr ON mr.prescription_id = pr.id
        WHERE mr.status = 'pending' AND mr.scheduled_for <= NOW()
        FOR UPDATE SKIP LOCKED
      `);

      for (const row of result.rows) {
        const patientName = `${row.first_name} ${row.last_name}`;
        
        const medNames = row.medications.map(m => m.name).join(', ');

        await enqueueEmail(
          row.email,
          'Medication Reminder',
          getMedicationReminderTemplate(patientName, medNames)
        );

        await client.query(`
          UPDATE medication_reminders SET status = 'sent' WHERE id = $1
        `, [row.id]);
      }

      await client.query('COMMIT');
      return result.rowCount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing due reminders:', error);
    } finally {
      client.release();
    }
  }
}

module.exports = new RemindersService();
