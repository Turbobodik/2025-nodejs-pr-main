const { Sequelize } = require('sequelize');

// Database configuration
// These can be overridden by environment variables
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'students_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
};

// Create Sequelize instance with connection pooling
// Sequelize uses node-postgres (pg) under the hood and manages connection pooling
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: {
      max: 5, // Maximum number of connections in pool
      min: 0, // Minimum number of connections in pool
      acquire: 30000, // Maximum time (ms) to wait for connection
      idle: 10000, // Maximum time (ms) a connection can be idle before being released
    },
  }
);

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection,
  config,
};
