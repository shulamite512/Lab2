

const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'airbnb_clone'
    });

    console.log('Connected to database...');

    // Add street_address column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN street_address VARCHAR(255) AFTER location
      `);
      console.log('✓ Added street_address column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ street_address column already exists');
      } else {
        throw err;
      }
    }

    // Add city column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN city VARCHAR(100) AFTER street_address
      `);
      console.log('✓ Added city column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ city column already exists');
      } else {
        throw err;
      }
    }

    // Add state column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN state VARCHAR(100) AFTER city
      `);
      console.log('✓ Added state column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ state column already exists');
      } else {
        throw err;
      }
    }

    // Add zip_code column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN zip_code VARCHAR(20) AFTER state
      `);
      console.log('✓ Added zip_code column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ zip_code column already exists');
      } else {
        throw err;
      }
    }

    // Add check_in_time column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN check_in_time TIME DEFAULT '15:00:00' AFTER max_guests
      `);
      console.log('✓ Added check_in_time column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ check_in_time column already exists');
      } else {
        throw err;
      }
    }

    // Add check_out_time column
    try {
      await connection.query(`
        ALTER TABLE properties
        ADD COLUMN check_out_time TIME DEFAULT '11:00:00' AFTER check_in_time
      `);
      console.log('✓ Added check_out_time column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ check_out_time column already exists');
      } else {
        throw err;
      }
    }

    console.log('\n Migration completed successfully!');
    console.log('You can now create properties with all fields.');

  } catch (error) {
    console.error(' Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
