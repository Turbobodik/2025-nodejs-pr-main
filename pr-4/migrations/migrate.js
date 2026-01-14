const { sequelize } = require('../config/database');
const Student = require('../models/Student');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Sync the model with the database (creates table if it doesn't exist)
    // Use { force: false } to avoid dropping existing data
    // Use { alter: true } to update schema if it exists
    await Student.sync({ alter: true });
    console.log('Students table is ready.');
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
