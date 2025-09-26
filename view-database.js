const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'finance_tracker.db');
const db = new sqlite3.Database(dbPath);

console.log('🗃️  Smart Finance Tracker Database');
console.log('📍 Location:', dbPath);
console.log('───────────────────────────────────');

// List all tables
db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
  if (err) {
    console.error('Error listing tables:', err);
    return;
  }
  
  console.log('\n📋 Tables in database:');
  tables.forEach(table => {
    console.log(`   • ${table.name}`);
  });
  
  // Show users table data
  console.log('\n👥 Users Table:');
  db.all("SELECT id, fullName, email, agreedToTerms, createdAt FROM users;", (err, users) => {
    if (err) {
      console.error('Error querying users:', err);
    } else if (users.length === 0) {
      console.log('   No users found.');
    } else {
      console.log('   ID | Full Name           | Email              | Agreed Terms | Created At');
      console.log('   ---|--------------------|--------------------|--------------|-------------------');
      users.forEach(user => {
        console.log(`   ${user.id.toString().padEnd(2)} | ${user.fullName.padEnd(18)} | ${user.email.padEnd(18)} | ${user.agreedToTerms ? 'Yes' : 'No'.padEnd(10)} | ${user.createdAt}`);
      });
    }
    
    // Show sessions table data
    console.log('\n🔐 User Sessions Table:');
    db.all("SELECT id, userId, token, expiresAt, createdAt FROM user_sessions;", (err, sessions) => {
      if (err) {
        console.error('Error querying sessions:', err);
      } else if (sessions.length === 0) {
        console.log('   No active sessions found.');
      } else {
        console.log('   ID | User ID | Token (first 20 chars) | Expires At          | Created At');
        console.log('   ---|---------|------------------------|---------------------|-------------------');
        sessions.forEach(session => {
          const shortToken = session.token.substring(0, 20) + '...';
          console.log(`   ${session.id.toString().padEnd(2)} | ${session.userId.toString().padEnd(7)} | ${shortToken.padEnd(22)} | ${session.expiresAt} | ${session.createdAt}`);
        });
      }
      
      console.log('\n✅ Database query completed!');
      db.close();
    });
  });
});