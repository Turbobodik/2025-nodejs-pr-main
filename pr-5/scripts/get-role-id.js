// Get role ID by role name
// Usage: node scripts/get-role-id.js <role_name>
// Example: node scripts/get-role-id.js admin

const { Role } = require('../models');

async function getRoleId() {
  try {
    const roleName = process.argv[2];
    
    if (!roleName) {
      console.error('Usage: node scripts/get-role-id.js <role_name>');
      console.error('Example: node scripts/get-role-id.js admin');
      process.exit(1);
    }
    
    const role = await Role.findOne({ where: { role_name: roleName } });
    
    if (role) {
      console.log(role.id);
      process.exit(0);
    } else {
      console.error(`Role '${roleName}' not found`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getRoleId();
