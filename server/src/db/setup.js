const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
  const dbName = process.env.DB_NAME;

  // 1. Connect to default 'postgres' database to create the new one
  console.log('Connecting to default postgres database...');
  const initialClient = new Client({ ...dbConfig, database: 'postgres' });
  
  try {
    await initialClient.connect();
    
    // Check if database exists
    const res = await initialClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Creating database ${dbName}...`);
      await initialClient.query(`CREATE DATABASE ${dbName}`);
      console.log('Database created successfully.');
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error('Error ensuring database exists:', err);
    process.exit(1);
  } finally {
    await initialClient.end();
  }

  // 2. Connect to the new database and run schema.sql
  console.log(`Connecting to ${dbName} to apply schema...`);
  const client = new Client({ ...dbConfig, database: dbName });
  
  try {
    await client.connect();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');
    
    // Verify
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\nCreated Tables:');
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));
    console.log(`\nTotal tables: ${tables.rowCount} (Expected 15)`);
    
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
