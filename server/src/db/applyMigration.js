// Applies ONE migration file to the database without touching existing data.
// Usage: node src/db/applyMigration.js 004_account_security.sql
// (npm run db:migrate rebuilds every table, so never run that against the live database.)
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node src/db/applyMigration.js <file in src/db/migrations>');
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', path.basename(file)), 'utf8');
  await pool.query(sql);
  console.log(`Applied ${path.basename(file)}`);
}

main()
  .catch(err => { console.error('Migration failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
