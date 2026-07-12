const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database.');
});

// Self-healing migrations
async function runMigrations() {
  try {
    // Existing migration
    await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE');
    console.log('Migration: is_approved column ensured.');

    // Doctor reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctor_reviews (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Migration: doctor_reviews table ensured.');

    // Pharmacies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone VARCHAR(30),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Migration: pharmacies table ensured.');

    // Pharmacy medicines
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_medicines (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
        medicine_name VARCHAR(200) NOT NULL,
        price_usd NUMERIC(10,2) NOT NULL,
        stock_qty INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(pharmacy_id, medicine_name)
      )
    `);
    console.log('Migration: pharmacy_medicines table ensured.');

    // Pharmacy orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_orders (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE SET NULL,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
        medicine_name VARCHAR(200) NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        total_price_usd NUMERIC(10,2) NOT NULL,
        stripe_session_id TEXT,
        payment_status VARCHAR(30) DEFAULT 'pending',
        delivery_status VARCHAR(30) DEFAULT 'pending',
        tracking_updates JSONB DEFAULT '[]',
        shipping_address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Migration: pharmacy_orders table ensured.');

    // Seed 5 pharmacies if none exist
    const bcrypt = require('bcrypt');
    const pharmaCheck = await pool.query('SELECT COUNT(*) FROM pharmacies');
    if (parseInt(pharmaCheck.rows[0].count) === 0) {
      const medicines = [
        'Amoxicillin 500mg', 'Paracetamol 500mg', 'Ibuprofen 400mg',
        'Metformin 500mg', 'Atorvastatin 10mg', 'Omeprazole 20mg',
        'Cetirizine 10mg', 'Azithromycin 250mg', 'Losartan 50mg', 'Vitamin D3 1000IU'
      ];
      const pharmacies = [
        { name: 'MediCare Pharmacy', address: '12 Health Street, Chennai', email: 'medicare@pharmacy.com', phone: '+91-9876543210' },
        { name: 'Apollo Drugs', address: '45 Main Road, Coimbatore', email: 'apollo@pharmacy.com', phone: '+91-9876543211' },
        { name: 'LifeCare Chemists', address: '78 Park Avenue, Madurai', email: 'lifecare@pharmacy.com', phone: '+91-9876543212' },
        { name: 'Green Cross Pharmacy', address: '23 Lake View, Trichy', email: 'greencross@pharmacy.com', phone: '+91-9876543213' },
        { name: 'CityMed Stores', address: '99 College Road, Salem', email: 'citymed@pharmacy.com', phone: '+91-9876543214' }
      ];
      const defaultPassword = await bcrypt.hash('pharmacy123', 10);
      // Price multipliers per pharmacy to create variety
      const priceMultipliers = [1.0, 1.15, 0.9, 1.05, 0.85];
      const basePrices = [8.50, 3.20, 5.75, 12.00, 18.50, 9.80, 4.50, 14.25, 11.00, 7.60];

      for (let pi = 0; pi < pharmacies.length; pi++) {
        const p = pharmacies[pi];
        const res = await pool.query(
          `INSERT INTO pharmacies (name, address, email, password_hash, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [p.name, p.address, p.email, defaultPassword, p.phone]
        );
        const pharmacyId = res.rows[0].id;
        for (let mi = 0; mi < medicines.length; mi++) {
          const price = (basePrices[mi] * priceMultipliers[pi]).toFixed(2);
          await pool.query(
            `INSERT INTO pharmacy_medicines (pharmacy_id, medicine_name, price_usd, stock_qty) VALUES ($1,$2,$3,$4)`,
            [pharmacyId, medicines[mi], price, 100]
          );
        }
      }
      console.log('Seed: 5 pharmacies with 10 medicines each created.');
    }
  } catch (err) {
    console.error('Migration/seed error:', err.message);
  }
}

runMigrations();

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
