const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database', 'finance_tracker.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'init.sql');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export async function initializeDatabase() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await db.exec(schema);

  console.log('Database initialized successfully');
  return db;
}

export async function getDatabase() {
  return await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

module.exports = {
  initializeDatabase,
  getDatabase
};