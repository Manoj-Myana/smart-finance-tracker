const { connectToDatabase } = require('./config/database');

async function checkTables() {
  try {
    const db = await connectToDatabase();
    const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Tables:', tables);
    
    // Check if goals table exists and create sample data
    const goalsTable = tables.find(table => table.name === 'goals');
    if (goalsTable) {
      console.log('Goals table exists');
      const goals = await db.all('SELECT * FROM goals LIMIT 5');
      console.log('Sample goals:', goals);
    } else {
      console.log('Goals table does not exist');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();