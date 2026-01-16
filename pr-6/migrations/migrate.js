const { sequelize } = require('../config/database');
const { Role, User, Student, Subject, Grade } = require('../models');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Sync all models in correct order (due to foreign keys)
    await Role.sync({ alter: true });
    console.log('Roles table is ready.');
    
    await User.sync({ alter: true });
    console.log('Users table is ready.');
    
    await Subject.sync({ alter: true });
    console.log('Subjects table is ready.');
    
    // Check if students table exists with old structure (without user_id)
    // If so, drop it since the structure has changed significantly
    try {
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'user_id'
      `);
      
      if (results.length === 0) {
        // Old structure exists, drop it
        console.log('Detected old students table structure. Dropping and recreating...');
        await sequelize.query('DROP TABLE IF EXISTS students CASCADE');
      }
    } catch (err) {
      // Table might not exist, continue
    }
    
    await Student.sync({ alter: true });
    console.log('Students table is ready.');
    
    await Grade.sync({ alter: true });
    console.log('Grades table is ready.');
    
    // Create default roles if they don't exist
    const roles = ['admin', 'teacher', 'student'];
    for (const roleName of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { role_name: roleName },
        defaults: { role_name: roleName },
      });
      if (created) {
        console.log(`Created default role: ${roleName}`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
