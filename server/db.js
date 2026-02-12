require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/readykids',
});

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database schema initialised');
}

async function seed() {
  await initSchema();
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'seed.sql'), 'utf8');
  await pool.query(sql);
  console.log('Seed data inserted');
  await pool.end();
}

module.exports = { pool, initSchema, seed };
