const Stripe = require('stripe');
const db = require('../../db');
const { enqueueEmail } = require('../email/emailQueue.service');
const { getBookingConfirmationTemplate } = require('../email/email.templates');
const calendarService = require('../calendar/calendar.service');

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_replace_me') {
    console.warn("WARNING: Stripe secret key is not set or using placeholder 'sk_test_replace_me'. Please set STRIPE_SECRET_KEY in server/.env.");
  }
  return Stripe(key);
};

class PaymentsController {
  /**
   * POST /api/payments/create-session
   * Creates a Stripe Checkout session and returns the URL.
   * The slot hold must already exist (created by /appointments/hold).
   */
  async createSession(req, res, next) {
    try {
      const { doctor_id, appointment_date, slot_time, symptoms_text } = req.body;
      const patientUserId = req.user.id;

      // Resolve patient profile
      const patientResult = await db.query('SELECT id, first_name, last_name FROM patients WHERE user_id = $1', [patientUserId]);
      if (patientResult.rowCount === 0) {
        return res.status(404).json({ message: 'Patient profile not found' });
      }
      const patient = patientResult.rows[0];

      // Resolve doctor info
      const doctorResult = await db.query('SELECT id, first_name, last_name, specialisation FROM doctors WHERE id = $1', [doctor_id]);
      if (doctorResult.rowCount === 0) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      const doctor = doctorResult.rows[0];

      const feeUsd = parseInt(process.env.CONSULTATION_FEE_USD || '50', 10);
      const amountCents = feeUsd * 100;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create Stripe Checkout session
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Consultation with Dr. ${doctor.first_name} ${doctor.last_name}`,
                description: `${doctor.specialisation} · ${appointment_date} at ${slot_time.substring(0, 5)}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        customer_email: req.user.email,
        success_url: `${frontendUrl}/patient/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/patient/doctors`,
        metadata: {
          patient_id: patient.id,
          doctor_id,
          appointment_date,
          slot_time,
          symptoms_text: symptoms_text || '',
          patient_user_id: patientUserId,
        },
      });

      // Persist the pending session so we can verify it on redirect
      await db.query(
        `INSERT INTO payment_sessions 
          (stripe_session_id, patient_id, doctor_id, appointment_date, slot_time, symptoms_text, amount_cents, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'usd', 'pending')`,
        [session.id, patient.id, doctor_id, appointment_date, slot_time, symptoms_text || '', amountCents]
      );

      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/verify?session_id=...
   * Called after Stripe redirects back. Verifies payment, books the appointment, saves symptoms.
   */
  async verifySession(req, res, next) {
    try {
      const { session_id } = req.query;
      if (!session_id) {
        return res.status(400).json({ message: 'session_id is required' });
      }

      // Check our DB first to prevent re-processing
      const existingSession = await db.query(
        'SELECT * FROM payment_sessions WHERE stripe_session_id = $1',
        [session_id]
      );

      if (existingSession.rowCount === 0) {
        return res.status(404).json({ message: 'Payment session not found' });
      }

      const ps = existingSession.rows[0];

      // If already processed, return the appointment
      if (ps.status === 'paid' && ps.appointment_id) {
        const apptResult = await db.query(
          `SELECT a.*, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
           FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.id = $1`,
          [ps.appointment_id]
        );
        return res.json({
          data: {
            alreadyProcessed: true,
            appointment: apptResult.rows[0],
            amountPaid: ps.amount_cents / 100,
          }
        });
      }

      // Verify with Stripe
      const stripeSession = await getStripe().checkout.sessions.retrieve(session_id);
      if (stripeSession.payment_status !== 'paid') {
        await db.query('UPDATE payment_sessions SET status = $1 WHERE stripe_session_id = $2', ['failed', session_id]);
        return res.status(402).json({ message: 'Payment not completed' });
      }

      const { patient_id, doctor_id, appointment_date, slot_time, symptoms_text, patient_user_id } = stripeSession.metadata;

      const client = await db.pool.connect();
      let newAppointment;
      try {
        await client.query('BEGIN');

        // Remove hold (if it still exists — it may have expired but that's fine, payment proves intent)
        await client.query(
          `DELETE FROM appointment_holds WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3`,
          [doctor_id, appointment_date, slot_time]
        );

        // Double-booking guard
        const existing = await client.query(
          `SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 AND status != 'cancelled' FOR UPDATE`,
          [doctor_id, appointment_date, slot_time]
        );
        if (existing.rowCount > 0) {
          await client.query('ROLLBACK');
          // Update session to failed — payment was collected but slot taken; admin should refund
          await client.query('UPDATE payment_sessions SET status = $1 WHERE stripe_session_id = $2', ['slot_conflict', session_id]);
          return res.status(409).json({ message: 'Slot was booked by another patient during payment. Please contact support for a refund.' });
        }

        // Book the appointment
        const apptRes = await client.query(
          `INSERT INTO appointments (patient_id, doctor_id, appointment_date, slot_time, status)
           VALUES ($1, $2, $3, $4, 'booked') RETURNING *`,
          [patient_id, doctor_id, appointment_date, slot_time]
        );
        newAppointment = apptRes.rows[0];

        // Save symptoms if provided
        if (symptoms_text && symptoms_text.trim()) {
          await client.query(
            `INSERT INTO symptoms (appointment_id, raw_symptoms) VALUES ($1, $2)`,
            [newAppointment.id, symptoms_text.trim()]
          );
        }

        // Mark payment session as paid with appointment link
        await client.query(
          `UPDATE payment_sessions SET status = 'paid', appointment_id = $1 WHERE stripe_session_id = $2`,
          [newAppointment.id, session_id]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // Post-booking: email + calendar (non-blocking)
      try {
        const detailsRes = await db.query(
          `SELECT p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email, pu.id AS p_user_id,
                  d.first_name AS d_fn, d.last_name AS d_ln, du.email AS d_email, du.id AS d_user_id, d.slot_duration_minutes
           FROM patients p JOIN users pu ON p.user_id = pu.id
           CROSS JOIN doctors d JOIN users du ON d.user_id = du.id
           WHERE p.id = $1 AND d.id = $2`,
          [patient_id, doctor_id]
        );

        if (detailsRes.rowCount > 0) {
          const det = detailsRes.rows[0];
          const pName = `${det.p_fn} ${det.p_ln}`;
          const dName = `Dr. ${det.d_fn} ${det.d_ln}`;

          await enqueueEmail(
            det.p_email,
            'Appointment Confirmed – Payment Received',
            getBookingConfirmationTemplate(pName, dName, appointment_date, slot_time)
          );

          const startDt = new Date(`${appointment_date}T${slot_time}Z`);
          const endDt = new Date(startDt.getTime() + det.slot_duration_minutes * 60000);
          await calendarService.syncAppointmentForUsers(newAppointment.id, det.p_user_id, det.d_user_id, {
            summary: `Appointment: ${pName} with ${dName}`,
            description: 'Healthcare appointment booked via portal (paid).',
            startDateTime: startDt.toISOString(),
            endDateTime: endDt.toISOString(),
          });
        }

        // Trigger AI pre-visit summary asynchronously if symptoms submitted
        if (symptoms_text && symptoms_text.trim()) {
          const aiRoutes = require('../ai/ai.service');
          if (aiRoutes && typeof aiRoutes.generatePreVisitSummary === 'function') {
            aiRoutes.generatePreVisitSummary(newAppointment.id, symptoms_text.trim()).catch(console.error);
          }
        }
      } catch (postErr) {
        console.error('Post-booking side effects failed (non-critical):', postErr);
      }

      const amountPaid = stripeSession.amount_total / 100;

      res.json({
        data: {
          appointment: newAppointment,
          amountPaid,
          currency: stripeSession.currency.toUpperCase(),
          receiptUrl: stripeSession.invoice || null,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/webhook
   * Handles Stripe webhooks to verify payment signature and book appointments asynchronously.
   */
  async handleWebhook(req, res, next) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !endpointSecret) {
        throw new Error('Missing stripe-signature or webhook secret configuration');
      }
      event = getStripe().webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const stripeSession = event.data.object;
      const sessionId = stripeSession.id;

      try {
        // Find existing session in DB
        const existingSession = await db.query(
          'SELECT * FROM payment_sessions WHERE stripe_session_id = $1',
          [sessionId]
        );

        if (existingSession.rowCount > 0) {
          const ps = existingSession.rows[0];
          // Only process if not already paid
          if (ps.status !== 'paid') {
            const { patient_id, doctor_id, appointment_date, slot_time, symptoms_text } = stripeSession.metadata;

            const client = await db.pool.connect();
            try {
              await client.query('BEGIN');

              // Remove hold if exists
              await client.query(
                `DELETE FROM appointment_holds WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3`,
                [doctor_id, appointment_date, slot_time]
              );

              // Check for duplicate booking
              const existing = await client.query(
                `SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND slot_time = $3 AND status != 'cancelled' FOR UPDATE`,
                [doctor_id, appointment_date, slot_time]
              );

              if (existing.rowCount === 0) {
                // Book the appointment
                const apptRes = await client.query(
                  `INSERT INTO appointments (patient_id, doctor_id, appointment_date, slot_time, status)
                   VALUES ($1, $2, $3, $4, 'booked') RETURNING *`,
                  [patient_id, doctor_id, appointment_date, slot_time]
                );
                const newAppointment = apptRes.rows[0];

                // Save symptoms if provided
                if (symptoms_text && symptoms_text.trim()) {
                  await client.query(
                    `INSERT INTO symptoms (appointment_id, raw_symptoms) VALUES ($1, $2)`,
                    [newAppointment.id, symptoms_text.trim()]
                  );
                }

                // Update payment session to paid
                await client.query(
                  `UPDATE payment_sessions SET status = 'paid', appointment_id = $1 WHERE stripe_session_id = $2`,
                  [newAppointment.id, sessionId]
                );

                await client.query('COMMIT');

                // Try to trigger side effects
                try {
                  const detailsRes = await db.query(
                    `SELECT p.first_name AS p_fn, p.last_name AS p_ln, pu.email AS p_email, pu.id AS p_user_id,
                            d.first_name AS d_fn, d.last_name AS d_ln, du.email AS d_email, du.id AS d_user_id, d.slot_duration_minutes
                     FROM patients p JOIN users pu ON p.user_id = pu.id
                     CROSS JOIN doctors d JOIN users du ON d.user_id = du.id
                     WHERE p.id = $1 AND d.id = $2`,
                    [patient_id, doctor_id]
                  );

                  if (detailsRes.rowCount > 0) {
                    const det = detailsRes.rows[0];
                    const pName = `${det.p_fn} ${det.p_ln}`;
                    const dName = `Dr. ${det.d_fn} ${det.d_ln}`;

                    await enqueueEmail(
                      det.p_email,
                      'Appointment Confirmed – Payment Received (Webhook)',
                      getBookingConfirmationTemplate(pName, dName, appointment_date, slot_time)
                    );

                    const startDt = new Date(`${appointment_date}T${slot_time}Z`);
                    const endDt = new Date(startDt.getTime() + det.slot_duration_minutes * 60000);
                    await calendarService.syncAppointmentForUsers(newAppointment.id, det.p_user_id, det.d_user_id, {
                      summary: `Appointment: ${pName} with ${dName}`,
                      description: 'Healthcare appointment booked via portal (paid via webhook).',
                      startDateTime: startDt.toISOString(),
                      endDateTime: endDt.toISOString(),
                    });
                  }

                  // Trigger AI pre-visit summary
                  if (symptoms_text && symptoms_text.trim()) {
                    const aiRoutes = require('../ai/ai.service');
                    if (aiRoutes && typeof aiRoutes.generatePreVisitSummary === 'function') {
                      aiRoutes.generatePreVisitSummary(newAppointment.id, symptoms_text.trim()).catch(console.error);
                    }
                  }
                } catch (postErr) {
                  console.error('Post-webhook side effects failed (non-critical):', postErr);
                }
              } else {
                await client.query('ROLLBACK');
                await db.query('UPDATE payment_sessions SET status = $1 WHERE stripe_session_id = $2', ['slot_conflict', sessionId]);
                console.warn('Slot conflict occurred during webhook verification.');
              }
            } catch (err) {
              await client.query('ROLLBACK');
              throw err;
            } finally {
              client.release();
            }
          }
        }
      } catch (err) {
        console.error('Error handling webhook event checkout.session.completed:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    res.json({ received: true });
  }

  /**
   * GET /api/payments/session/:appointmentId
   * Returns payment info for a given appointment (for invoice display).
   */
  async getPaymentByAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const result = await db.query(
        `SELECT stripe_session_id, amount_cents, currency, status, created_at
         FROM payment_sessions WHERE appointment_id = $1 AND status = 'paid' LIMIT 1`,
        [appointmentId]
      );
      if (result.rowCount === 0) {
        return res.json({ data: null });
      }
      const ps = result.rows[0];
      res.json({
        data: {
          stripeSessionId: ps.stripe_session_id,
          amountPaid: ps.amount_cents / 100,
          currency: ps.currency.toUpperCase(),
          status: ps.status,
          paidAt: ps.created_at,
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentsController();
