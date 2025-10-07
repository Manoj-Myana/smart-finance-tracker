const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'finance_tracker.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to the SQLite database.');
});

// Check users
db.all('SELECT id, fullName, email, createdAt FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error querying users:', err);
    return;
  }
  console.log('\nUsers in database:');
  console.log(rows);
  
  // Check goals
  db.all('SELECT * FROM goals', [], (err, goalRows) => {
    if (err) {
      console.error('Error querying goals:', err);
    } else {
      console.log('\nGoals in database:');
      console.log(goalRows);
    }
    
    db.close();
  });
});