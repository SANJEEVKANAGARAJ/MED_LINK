const { Client } = require('pg');
(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'healthcare_db',
  });
  try {
    await client.connect();
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    console.log('Tables:', res.rows.map(r => r.table_name));
  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await client.end();
  }
})();
