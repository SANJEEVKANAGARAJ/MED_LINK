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

// Self-healing migration to ensure is_approved column exists
pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE')
  .then(() => {
    console.log('Database migration: successfully ensured is_approved column exists in appointments table.');
  })
  .catch(err => {
    console.error('Database migration error while adding column:', err);
  });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
