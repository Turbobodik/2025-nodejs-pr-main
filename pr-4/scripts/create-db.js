const { Client } = require('pg');

// Connect to postgres database (default database) to create our database
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres', // Connect to default postgres database
});

async function createDatabase() {
  const dbName = process.env.DB_NAME || 'students_db';
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDb.rows.length > 0) {
      console.log(`Database "${dbName}" already exists.`);
    } else {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully!`);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating database:', error.message);
    if (client._ending === false) {
      await client.end();
    }
    process.exit(1);
  }
}

createDatabase();