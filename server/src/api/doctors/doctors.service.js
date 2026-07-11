const bcrypt = require('bcrypt');
const db = require('../../db');
const { enqueueEmail } = require('../email/emailQueue.service');
const { getLeaveNotificationTemplate } = require('../email/email.templates');
const calendarService = require('../calendar/calendar.service');

class DoctorsService {
  async getAllDoctors(page = 1, limit = 10) {
    const countResult = await db.query('SELECT COUNT(*) FROM doctors');
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT d.id, d.user_id, d.first_name, d.last_name, d.specialisation, d.slot_duration_minutes, u.email, u.profile_image_url
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    return {
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async getDoctorById(id) {
    const result = await db.query(
      `SELECT d.id, d.user_id, d.first_name, d.last_name, d.specialisation, d.slot_duration_minutes, u.email, u.profile_image_url
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Doctor not found' };
    }
    return result.rows[0];
  }

  async getDoctorByUserId(userId) {
    const result = await db.query(
      `SELECT d.id, d.user_id, d.first_name, d.last_name, d.specialisation, d.slot_duration_minutes, u.email, u.profile_image_url
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [userId]
    );
    
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Doctor profile not found' };
    }
    return result.rows[0];
  }

  async createDoctor(data) {
    const { email, password, first_name, last_name, specialisation, slot_duration_minutes, schedules } = data;

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount > 0) {
      throw { statusCode: 409, message: 'User with this email already exists' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name',
        [email, passwordHash, first_name, last_name, 'doctor']
      );
      const user = userResult.rows[0];

      const doctorResult = await client.query(
        'INSERT INTO doctors (user_id, first_name, last_name, specialisation, slot_duration_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.id, first_name, last_name, specialisation, slot_duration_minutes]
      );

      const doctor = doctorResult.rows[0];

      if (schedules && schedules.length > 0) {
        for (const schedule of schedules) {
          await client.query(
            'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
            [doctor.id, schedule.day_of_week, schedule.start_time, schedule.end_time]
          );
        }
      }

      await client.query('COMMIT');
      return { ...doctor, email: user.email };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDoctor(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const { schedules, ...doctorFields } = data;
    
    for (const [key, value] of Object.entries(doctorFields)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0 && !schedules) {
      throw { statusCode: 400, message: 'No fields provided for update' };
    }

    let doctorRow = null;
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE doctors SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
      const result = await db.query(query, values);
      if (result.rowCount === 0) {
        throw { statusCode: 404, message: 'Doctor not found' };
      }
      doctorRow = result.rows[0];
    }

    if (schedules) {
      await this.setAvailability(id, schedules);
    }
    
    return doctorRow || { id, message: 'Availability updated' };
  }

  async deleteDoctor(id) {
    // Because of ON DELETE CASCADE, deleting the user will delete the doctor profile and everything else
    const doctorResult = await db.query('SELECT user_id FROM doctors WHERE id = $1', [id]);
    if (doctorResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Doctor not found' };
    }

    const userId = doctorResult.rows[0].user_id;
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  async getAvailability(doctorId) {
    const result = await db.query(
      'SELECT day_of_week, start_time, end_time FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, start_time',
      [doctorId]
    );
    return result.rows;
  }

  async setAvailability(doctorId, schedules) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing availability
      await client.query('DELETE FROM doctor_availability WHERE doctor_id = $1', [doctorId]);
      
      // Insert new schedules
      for (const schedule of schedules) {
        await client.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [doctorId, schedule.day_of_week, schedule.start_time, schedule.end_time]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLeave(doctorId) {
    const result = await db.query(
      'SELECT id, leave_date FROM doctor_leave WHERE doctor_id = $1 ORDER BY leave_date ASC',
      [doctorId]
    );
    return result.rows;
  }

  async addLeave(doctorId, date) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert leave
      await client.query(
        'INSERT INTO doctor_leave (doctor_id, leave_date) VALUES ($1, $2)',
        [doctorId, date]
      );

      // 2. Find all active appointments for this doctor on this date
      const appointmentsResult = await client.query(
        `SELECT a.id, u.email, u.id AS patient_user_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name, 
                d.user_id AS doctor_user_id, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, a.slot_time
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.doctor_id = $1 AND a.appointment_date = $2 AND a.status != 'cancelled' FOR UPDATE`,
        [doctorId, date]
      );

      if (appointmentsResult.rowCount > 0) {
        const appointmentIds = appointmentsResult.rows.map(row => row.id);

        // 3. Cancel appointments
        await client.query(
          `UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ANY($1::uuid[])`,
          [appointmentIds]
        );

        // 4. Queue cancellation emails and delete calendar events
        for (const appt of appointmentsResult.rows) {
          const patientName = `${appt.patient_first_name} ${appt.patient_last_name}`;
          const doctorName = `Dr. ${appt.doctor_first_name} ${appt.doctor_last_name}`;
          
          await enqueueEmail(
            appt.email, 
            'Appointment Cancelled - Doctor on Leave', 
            getLeaveNotificationTemplate(patientName, doctorName, date)
          );

          await calendarService.deleteEvent(appt.id, appt.patient_user_id);
          await calendarService.deleteEvent(appt.id, appt.doctor_user_id);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        throw { statusCode: 409, message: 'Leave already exists for this date' };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async removeLeave(doctorId, date) {
    const result = await db.query(
      'DELETE FROM doctor_leave WHERE doctor_id = $1 AND leave_date = $2',
      [doctorId, date]
    );
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Leave not found for this date' };
    }
  }
}

module.exports = new DoctorsService();
