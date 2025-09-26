const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'finance_tracker.db');
const db = new sqlite3.Database(dbPath);

console.log('Database path:', dbPath);

// Check if transactions table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
  } else if (row) {
    console.log('Transactions table exists');
    
    // Get table schema
    db.all("PRAGMA table_info(transactions)", (err, rows) => {
      if (err) {
        console.error('Error getting schema:', err);
      } else {
        console.log('Table schema:');
        rows.forEach(column => {
          console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
        });
      }
      
      // Count existing transactions
      db.get("SELECT COUNT(*) as count FROM transactions", (err, row) => {
        if (err) {
          console.error('Error counting transactions:', err);
        } else {
          console.log(`Existing transactions: ${row.count}`);
        }
        db.close();
      });
    });
  } else {
    console.log('Transactions table does NOT exist');
    db.close();
  }
});