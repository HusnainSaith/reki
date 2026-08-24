const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client } = require('pg');

async function dropAllTables() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'reki_db',
  });

  await client.connect();
  console.log(`Connected to database: ${process.env.DB_NAME || 'reki_db'}`);

  try {
    await client.query('BEGIN');

    // Drop all tables in public schema (CASCADE handles foreign keys)
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    if (rows.length === 0) {
      console.log('No tables found.');
    } else {
      const tableNames = rows.map(r => `"${r.tablename}"`).join(', ');
      await client.query(`DROP TABLE IF EXISTS ${tableNames} CASCADE`);
      console.log(`Dropped ${rows.length} table(s): ${rows.map(r => r.tablename).join(', ')}`);
    }

    await client.query('COMMIT');
    console.log('Done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dropAllTables();
