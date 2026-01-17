const { Role } = require('../models');

async function getAdminRole() {
  try {
    const adminRole = await Role.findOne({ where: { role_name: 'admin' } });
    if (adminRole) {
      console.log(adminRole.id);
      process.exit(0);
    } else {
      console.error('Admin role not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getAdminRole();
