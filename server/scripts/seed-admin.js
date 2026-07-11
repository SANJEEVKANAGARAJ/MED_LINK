const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedAdmin() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'this_is_password';
  const defaultPassword = 'password123';

  try {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const defaultHash = await bcrypt.hash(defaultPassword, 10);

    // 1. Seed or Update Admin
    const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
    if (existingAdmin.rowCount > 0) {
      await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [adminHash, adminEmail]);
      console.log('Admin user password reset/updated successfully!');
    } else {
      await pool.query(
        "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')",
        [adminEmail, adminHash]
      );
      console.log('Admin user seeded successfully!');
    }

    // 2. Seed or Update Doctor (antigravity4145@gmail.com)
    const existingDoctorUser = await pool.query("SELECT id FROM users WHERE email = 'antigravity4145@gmail.com'");
    let doctorUserId;
    if (existingDoctorUser.rowCount > 0) {
      doctorUserId = existingDoctorUser.rows[0].id;
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [defaultHash, doctorUserId]);
      console.log('Doctor user password reset to "password123".');
    } else {
      const docUserRes = await pool.query(
        "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ('antigravity4145@gmail.com', $1, 'doctor', 'GOKUL', 'KRISHNA') RETURNING id",
        [defaultHash]
      );
      doctorUserId = docUserRes.rows[0].id;
      console.log('Doctor user seeded.');
    }

    // Ensure Doctor Profile exists in doctors table
    const existingDocProfile = await pool.query("SELECT id FROM doctors WHERE user_id = $1", [doctorUserId]);
    if (existingDocProfile.rowCount === 0) {
      await pool.query(
        "INSERT INTO doctors (user_id, first_name, last_name, specialisation, slot_duration_minutes) VALUES ($1, 'GOKUL', 'KRISHNA', 'cardiologist', 30)",
        [doctorUserId]
      );
      console.log('Doctor profile created.');
    }

    // 3. Seed or Update Patient (23z258@psgtech.ac.in)
    const existingPatientUser = await pool.query("SELECT id FROM users WHERE email = '23z258@psgtech.ac.in'");
    let patientUserId;
    if (existingPatientUser.rowCount > 0) {
      patientUserId = existingPatientUser.rows[0].id;
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [defaultHash, patientUserId]);
      console.log('Patient user password reset to "password123".');
    } else {
      const patUserRes = await pool.query(
        "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ('23z258@psgtech.ac.in', $1, 'patient', 'Test', 'Patient') RETURNING id",
        [defaultHash]
      );
      patientUserId = patUserRes.rows[0].id;
      console.log('Patient user seeded.');
    }

    // Ensure Patient Profile exists in patients table
    const existingPatProfile = await pool.query("SELECT id FROM patients WHERE user_id = $1", [patientUserId]);
    if (existingPatProfile.rowCount === 0) {
      await pool.query(
        "INSERT INTO patients (user_id, first_name, last_name, date_of_birth) VALUES ($1, 'Test', 'Patient', '1995-01-01')",
        [patientUserId]
      );
      console.log('Patient profile created.');
    }

    console.log('\n--- Accounts Ready for Testing ---');
    console.log(`Admin Email:   ${adminEmail}  | Password: ${adminPassword}`);
    console.log(`Doctor Email:  antigravity4145@gmail.com | Password: ${defaultPassword}`);
    console.log(`Patient Email: 23z258@psgtech.ac.in      | Password: ${defaultPassword}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();
