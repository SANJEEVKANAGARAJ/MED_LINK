const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');
const appointmentsService = require('../src/api/appointments/appointments.service');

async function runConcurrencyTest() {
  console.log('--- Starting Concurrency Test ---');

  try {
    // 1. Setup mock data
    const email1 = 'test_patient1@example.com';
    const email2 = 'test_patient2@example.com';
    const docEmail = 'test_doc_concurrency@example.com';

    await db.query('DELETE FROM users WHERE email IN ($1, $2, $3)', [email1, email2, docEmail]);
    
    const user1 = (await db.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [email1, 'hash', 'patient'])).rows[0];
    const user2 = (await db.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [email2, 'hash', 'patient'])).rows[0];
    const docUser = (await db.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [docEmail, 'hash', 'doctor'])).rows[0];
    
    await db.query('INSERT INTO patients (user_id, first_name, last_name, date_of_birth) VALUES ($1, $2, $3, $4)', [user1.id, 'P1', 'L1', '1990-01-01']);
    await db.query('INSERT INTO patients (user_id, first_name, last_name, date_of_birth) VALUES ($1, $2, $3, $4)', [user2.id, 'P2', 'L2', '1990-01-01']);
    
    const doc = (await db.query('INSERT INTO doctors (user_id, first_name, last_name, specialisation, slot_duration_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING id', [docUser.id, 'Doc', 'Concur', 'Test', 30])).rows[0];
    
    // Add availability for today (day 0-6)
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    await db.query('INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)', [doc.id, dayOfWeek, '09:00:00', '17:00:00']);
    
    const appointmentDate = today.toISOString().split('T')[0];
    const slotTime = '10:00:00';

    console.log(`Simulating 5 simultaneous hold requests for Doctor ${doc.id} at ${appointmentDate} ${slotTime}...`);

    // 2. Fire simultaneous requests
    const promises = [
      appointmentsService.holdSlot(user1.id, { doctor_id: doc.id, appointment_date: appointmentDate, slot_time: slotTime }),
      appointmentsService.holdSlot(user2.id, { doctor_id: doc.id, appointment_date: appointmentDate, slot_time: slotTime }),
      appointmentsService.holdSlot(user1.id, { doctor_id: doc.id, appointment_date: appointmentDate, slot_time: slotTime }),
      appointmentsService.holdSlot(user2.id, { doctor_id: doc.id, appointment_date: appointmentDate, slot_time: slotTime }),
      appointmentsService.holdSlot(user1.id, { doctor_id: doc.id, appointment_date: appointmentDate, slot_time: slotTime }),
    ];

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let failCount = 0;

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        console.log(`Request ${idx + 1}: SUCCESS (Hold ID: ${r.value.id})`);
        successCount++;
      } else {
        console.log(`Request ${idx + 1}: FAILED (${r.reason.statusCode} - ${r.reason.message})`);
        failCount++;
      }
    });

    console.log('\\n--- Test Results ---');
    console.log(`Successful Holds: ${successCount}`);
    console.log(`Failed Holds (Blocked by Pessimistic Locking): ${failCount}`);

    if (successCount === 1 && failCount === 4) {
      console.log('TEST PASSED: Concurrency protection works perfectly.');
    } else {
      console.error('TEST FAILED: Race condition detected!');
    }

  } catch (error) {
    console.error('Test script error:', error);
  } finally {
    process.exit(0);
  }
}

runConcurrencyTest();
