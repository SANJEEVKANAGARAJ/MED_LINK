const db = require('../../db');
const { enqueueEmail } = require('../email/emailQueue.service');
const { getBookingConfirmationTemplate, getCancellationTemplate, getRescheduleTemplate } = require('../email/email.templates');
const calendarService = require('../calendar/calendar.service');

class AppointmentsService {
  /**
   * Helper function to generate time slots between a start and end time
   * @param {string} startTime - HH:MM:SS
   * @param {string} endTime - HH:MM:SS
   * @param {number} durationMinutes 
   */
  generateSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    let [startH, startM, startS] = startTime.split(':').map(Number);
    const [endH, endM, endS] = endTime.split(':').map(Number);
    
    let currentTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    while (currentTotalMinutes + durationMinutes <= endTotalMinutes) {
      const h = Math.floor(currentTotalMinutes / 60);
      const m = currentTotalMinutes % 60;
      const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      slots.push(formattedTime);
      currentTotalMinutes += durationMinutes;
    }
    
    return slots;
  }

  async getAvailableSlots(doctorId, date) {
    // 1. Check if doctor is on leave
    const leaveResult = await db.query(
      'SELECT id FROM doctor_leave WHERE doctor_id = $1 AND leave_date = $2',
      [doctorId, date]
    );
    if (leaveResult.rowCount > 0) {
      return []; // Doctor is on leave, no slots available
    }

    // 2. Determine day of week (0 = Sunday in JS, check if matching postgres or standard)
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // 3. Fetch availability and doctor details (for slot duration)
    const availabilityResult = await db.query(
      `SELECT a.start_time, a.end_time, d.slot_duration_minutes 
       FROM doctor_availability a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.doctor_id = $1 AND a.day_of_week = $2`,
      [doctorId, dayOfWeek]
    );

    if (availabilityResult.rowCount === 0) {
      return []; // Doctor does not work on this day
    }

    let allGeneratedSlots = [];
    const slotDuration = availabilityResult.rows[0].slot_duration_minutes;

    // Doctor might have multiple shifts (e.g. morning and evening)
    for (const shift of availabilityResult.rows) {
      const slotsForShift = this.generateSlots(shift.start_time, shift.end_time, slotDuration);
      allGeneratedSlots = allGeneratedSlots.concat(slotsForShift);
    }

    // 4. Fetch existing active appointments
    const appointmentsResult = await db.query(
      `SELECT slot_time FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'cancelled'`,
      [doctorId, date]
    );

    // Fetch active holds
    const holdsResult = await db.query(
      `SELECT slot_time FROM appointment_holds 
       WHERE doctor_id = $1 AND appointment_date = $2 AND expires_at > CURRENT_TIMESTAMP`,
      [doctorId, date]
    );

    const bookedSlots = appointmentsResult.rows.map(r => r.slot_time);
    const heldSlots = holdsResult.rows.map(r => r.slot_time);
    const unavailableSlots = [...bookedSlots, ...heldSlots];

    // 5. Filter out booked and held slots
    let availableSlots = allGeneratedSlots.filter(slot => !unavailableSlots.includes(slot));
    
    // 6. If date is today, filter out past slots
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const now = new Date();
      // Calculate current time in minutes since midnight
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      availableSlots = availableSlots.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        return (h * 60 + m) > currentTotalMinutes;
      });
    }
    
    return availableSlots;
  }

  async holdSlot(patientUserId, data) {
    const { doctor_id, appointment_date, slot_time } = data;

    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [patientUserId]);
    if (patientResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Patient profile not found for this user' };
    }
    const patient_id = patientResult.rows[0].id;

    // Check working hours first
    const availableSlots = await this.getAvailableSlots(doctor_id, appointment_date);
    if (!availableSlots.includes(slot_time)) {
      throw { statusCode: 400, message: 'This slot is not available or outside working hours' };
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Pessimistic lock on any existing hold for this slot
      const holdCheck = await client.query(
        `SELECT id, expires_at FROM appointment_holds 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 FOR UPDATE`,
        [doctor_id, appointment_date, slot_time]
      );

      if (holdCheck.rowCount > 0) {
        const hold = holdCheck.rows[0];
        if (new Date(hold.expires_at) > new Date()) {
          throw { statusCode: 409, message: 'This slot is currently held by someone else.' };
        } else {
          // Delete expired hold
          await client.query(`DELETE FROM appointment_holds WHERE id = $1`, [hold.id]);
        }
      }

      // Check if it got booked in the meantime
      const appointmentCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 AND status != 'cancelled' FOR UPDATE`,
        [doctor_id, appointment_date, slot_time]
      );

      if (appointmentCheck.rowCount > 0) {
        throw { statusCode: 409, message: 'This slot is already booked.' };
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const result = await client.query(
        `INSERT INTO appointment_holds (patient_id, doctor_id, appointment_date, slot_time, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [patient_id, doctor_id, appointment_date, slot_time, expiresAt]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bookAppointment(patientUserId, data) {
    const { doctor_id, appointment_date, slot_time } = data;

    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [patientUserId]);
    if (patientResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Patient profile not found for this user' };
    }
    const patient_id = patientResult.rows[0].id;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Check for active hold by this patient
      const holdCheck = await client.query(
        `SELECT id FROM appointment_holds 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 
         AND patient_id = $4 AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [doctor_id, appointment_date, slot_time, patient_id]
      );

      if (holdCheck.rowCount === 0) {
        // Either no hold, hold expired, or hold belongs to someone else
        throw { statusCode: 400, message: 'Hold has expired or does not exist. Please try holding the slot again.' };
      }

      // Delete the hold
      await client.query(`DELETE FROM appointment_holds WHERE id = $1`, [holdCheck.rows[0].id]);

      // Check for double booking just in case
      const appointmentCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 AND status != 'cancelled' FOR UPDATE`,
        [doctor_id, appointment_date, slot_time]
      );

      if (appointmentCheck.rowCount > 0) {
        throw { statusCode: 409, message: 'This slot is already booked.' };
      }

      // Insert appointment
      const result = await client.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, slot_time, status)
         VALUES ($1, $2, $3, $4, 'booked') RETURNING *`,
        [patient_id, doctor_id, appointment_date, slot_time]
      );

      const detailsResult = await client.query(`
        SELECT 
          p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email, pu.id AS p_user_id,
          d.first_name AS d_fn, d.last_name AS d_ln, du.email AS d_email, du.id AS d_user_id,
          d.slot_duration_minutes
        FROM patients p
        JOIN users pu ON p.user_id = pu.id
        CROSS JOIN doctors d
        JOIN users du ON d.user_id = du.id
        WHERE p.id = $1 AND d.id = $2
      `, [patient_id, doctor_id]);

      await client.query('COMMIT');

      // Send emails and sync calendar AFTER commit is successful
      if (detailsResult.rowCount > 0) {
        const details = detailsResult.rows[0];
        const pName = `${details.p_fn} ${details.p_ln}`;
        const dName = `Dr. ${details.d_fn} ${details.d_ln}`;
        
        try {
          await enqueueEmail(
            details.p_email, 
            'Appointment Confirmed', 
            getBookingConfirmationTemplate(pName, dName, appointment_date, slot_time)
          );
          
          await enqueueEmail(
            details.d_email,
            'New Appointment Booked',
            `<p>Dear ${dName},</p><p>A new appointment has been booked by ${pName} on ${appointment_date} at ${slot_time}.</p>`
          );

          // Calendar Sync
          const startDateTime = new Date(`${appointment_date}T${slot_time}Z`);
          const endDateTime = new Date(startDateTime.getTime() + details.slot_duration_minutes * 60000);
          
          const eventDetails = {
            summary: `Appointment: ${pName} with ${dName}`,
            description: 'Healthcare appointment booked via portal.',
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString()
          };

          await calendarService.syncAppointmentForUsers(result.rows[0].id, details.p_user_id, details.d_user_id, eventDetails);
        } catch (syncError) {
          console.error('Error during post-booking notifications/sync:', syncError);
        }
      }

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') { 
        throw { statusCode: 409, message: 'This time slot was just booked by someone else. Please select another slot.' };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppointments(userId, role, page = 1, limit = 10) {
    let baseQuery = `
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
    `;
    const params = [];

    if (role === 'patient') {
      baseQuery += ` WHERE p.user_id = $1`;
      params.push(userId);
    } else if (role === 'doctor') {
      baseQuery += ` WHERE d.user_id = $1`;
      params.push(userId);
    }

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.id, a.appointment_date, a.slot_time, a.status,
        p.id AS patient_id, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
        d.id AS doctor_id, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.specialisation
      ${baseQuery}
      ORDER BY a.appointment_date DESC, a.slot_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);
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

  async cancelAppointment(appointmentId, userId, role) {
    const appointmentResult = await db.query(
      `SELECT a.id, p.user_id AS patient_user_id, d.user_id AS doctor_user_id, a.status 
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (appointmentResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Appointment not found' };
    }

    const appt = appointmentResult.rows[0];

    // RBAC verification
    if (role !== 'admin' && appt.patient_user_id !== userId && appt.doctor_user_id !== userId) {
      throw { statusCode: 403, message: 'Forbidden to cancel this appointment' };
    }

    if (appt.status === 'cancelled') {
      throw { statusCode: 400, message: 'Appointment is already cancelled' };
    }

    const result = await db.query(
      `UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [appointmentId]
    );

    const detailsResult = await db.query(`
      SELECT 
        p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email, pu.id AS p_user_id,
        d.first_name AS d_fn, d.last_name AS d_ln, du.email AS d_email, du.id AS d_user_id,
        a.appointment_date, a.slot_time
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE a.id = $1
    `, [appointmentId]);

    if (detailsResult.rowCount > 0) {
      const details = detailsResult.rows[0];
      const pName = `${details.p_fn} ${details.p_ln}`;
      const dName = `Dr. ${details.d_fn} ${details.d_ln}`;
      
      await enqueueEmail(
        details.p_email, 
        'Appointment Cancelled', 
        getCancellationTemplate(pName, dName, details.appointment_date, details.slot_time)
      );
      
      await enqueueEmail(
        details.d_email,
        'Appointment Cancelled',
        `<p>Dear ${dName},</p><p>Your appointment with ${pName} on ${details.appointment_date} at ${details.slot_time} has been cancelled.</p>`
      );

      // Calendar Sync: delete events
      await calendarService.deleteEvent(appointmentId, details.p_user_id);
      await calendarService.deleteEvent(appointmentId, details.d_user_id);
    }
    
    return result.rows[0];
  }

  async rescheduleAppointment(appointmentId, userId, role, data) {
    const { doctor_id, appointment_date, slot_time } = data;

    const appointmentResult = await db.query(
      `SELECT a.id, p.user_id AS patient_user_id, p.id AS patient_id, d.user_id AS doctor_user_id, a.status 
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (appointmentResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Appointment not found' };
    }

    const appt = appointmentResult.rows[0];

    if (role !== 'admin' && appt.patient_user_id !== userId && appt.doctor_user_id !== userId) {
      throw { statusCode: 403, message: 'Forbidden to reschedule this appointment' };
    }

    if (appt.status === 'cancelled' || appt.status === 'completed') {
      throw { statusCode: 400, message: `Cannot reschedule a ${appt.status} appointment` };
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const holdCheck = await client.query(
        `SELECT id FROM appointment_holds 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 
         AND patient_id = $4 AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [doctor_id, appointment_date, slot_time, appt.patient_id]
      );

      if (holdCheck.rowCount === 0) {
        throw { statusCode: 400, message: 'Hold for the new slot has expired or does not exist.' };
      }

      await client.query(`DELETE FROM appointment_holds WHERE id = $1`, [holdCheck.rows[0].id]);

      const appointmentCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 AND status != 'cancelled' FOR UPDATE`,
        [doctor_id, appointment_date, slot_time]
      );

      if (appointmentCheck.rowCount > 0) {
        throw { statusCode: 409, message: 'The new slot is already booked.' };
      }

      await client.query(
        `UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [appointmentId]
      );

      const result = await client.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, slot_time, status)
         VALUES ($1, $2, $3, $4, 'booked') RETURNING *`,
        [appt.patient_id, doctor_id, appointment_date, slot_time]
      );

      const detailsResult = await client.query(`
        SELECT 
          p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email, pu.id AS p_user_id,
          d.first_name AS d_fn, d.last_name AS d_ln, du.email AS d_email, du.id AS d_user_id, d.slot_duration_minutes,
          old_a.appointment_date AS old_date, old_a.slot_time AS old_time
        FROM patients p
        JOIN users pu ON p.user_id = pu.id
        CROSS JOIN doctors d
        JOIN users du ON d.user_id = du.id
        CROSS JOIN appointments old_a
        WHERE p.id = $1 AND d.id = $2 AND old_a.id = $3
      `, [appt.patient_id, doctor_id, appointmentId]);

      await client.query('COMMIT');

      // Send emails and sync calendar AFTER commit is successful
      if (detailsResult.rowCount > 0) {
        const details = detailsResult.rows[0];
        const pName = `${details.p_fn} ${details.p_ln}`;
        const dName = `Dr. ${details.d_fn} ${details.d_ln}`;
        
        try {
          await enqueueEmail(
            details.p_email, 
            'Appointment Rescheduled', 
            getRescheduleTemplate(pName, dName, details.old_date, details.old_time, appointment_date, slot_time)
          );
          
          await enqueueEmail(
            details.d_email,
            'Appointment Rescheduled',
            `<p>Dear ${dName},</p><p>Your appointment with ${pName} originally on ${details.old_date} at ${details.old_time} has been rescheduled to ${appointment_date} at ${slot_time}.</p>`
          );

          // Calendar Sync
          const startDateTime = new Date(`${appointment_date}T${slot_time}Z`);
          const endDateTime = new Date(startDateTime.getTime() + details.slot_duration_minutes * 60000);
          
          const eventDetails = {
            summary: `Appointment: ${pName} with ${dName}`,
            description: 'Healthcare appointment rescheduled via portal.',
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString()
          };

          // Note: Google Calendar requires deleting and recreating if the event was already deleted, 
          // but since we keep the same appointmentId, updateEvent should work if it exists.
          await calendarService.updateEvent(appointmentId, details.p_user_id, eventDetails);
          await calendarService.updateEvent(appointmentId, details.d_user_id, eventDetails);
        } catch (syncError) {
          console.error('Error during post-reschedule notifications/sync:', syncError);
        }
      }

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupExpiredHolds() {
    try {
      const result = await db.query(`
        DELETE FROM appointment_holds
        WHERE expires_at < NOW()
        RETURNING id
      `);
      if (result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} expired appointment holds.`);
      }
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired holds:', error);
    }
  }

  async sendUpcomingAppointmentReminders() {
    // Call this via a daily cron job
    const { getReminderTemplate } = require('../email/email.templates');
    
    // Find appointments booked for tomorrow
    const query = `
      SELECT a.id, a.appointment_date, a.slot_time, 
             p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email,
             d.first_name AS d_fn, d.last_name AS d_ln
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.status = 'booked' 
        AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
    `;
    
    const result = await db.query(query);
    
    for (const appt of result.rows) {
      const pName = `${appt.p_fn} ${appt.p_ln}`;
      const dName = `Dr. ${appt.d_fn} ${appt.d_ln}`;
      
      await enqueueEmail(
        appt.p_email,
        'Appointment Reminder',
        getReminderTemplate(pName, dName, appt.appointment_date, appt.slot_time)
      );
    }
    
    return result.rowCount;
  }

  async completeAppointment(appointmentId, doctorUserId) {
    const doctorResult = await db.query('SELECT id FROM doctors WHERE user_id = $1', [doctorUserId]);
    if (doctorResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Doctor profile not found' };
    }
    const doctorId = doctorResult.rows[0].id;

    const apptResult = await db.query('SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2', [appointmentId, doctorId]);
    if (apptResult.rowCount === 0) {
      throw { statusCode: 404, message: 'Appointment not found or unauthorized' };
    }

    const result = await db.query(
      `UPDATE appointments 
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [appointmentId]
    );

    return result.rows[0];
  }
}

module.exports = new AppointmentsService();
