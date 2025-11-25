const mysql = require('mysql2/promise');

(async () => {
  try {
    const db = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'airbnb_clone',
      waitForConnections: true,
      connectionLimit: 5,
    });

    const [rows] = await db.query(
      `SELECT b.id, b.property_id, p.property_name, b.traveler_id, t.name as traveler_name, b.owner_id, o.name as owner_name, b.start_date, b.end_date, b.number_of_guests, b.total_price, b.status, b.created_at
       FROM bookings b
       LEFT JOIN properties p ON b.property_id = p.id
       LEFT JOIN users t ON b.traveler_id = t.id
       LEFT JOIN users o ON b.owner_id = o.id
       ORDER BY b.created_at DESC
       LIMIT 20`
    );

    console.log('Latest bookings:');
    rows.forEach(r => {
      console.log(`ID ${r.id} | property ${r.property_id} (${r.property_name}) | traveler ${r.traveler_id} (${r.traveler_name}) | owner ${r.owner_id} (${r.owner_name}) | ${r.start_date} -> ${r.end_date} | guests ${r.number_of_guests} | ${r.total_price} | ${r.status}`);
    });

    await db.end();
    process.exit(0);
  } catch (e) {
    console.error('Error querying bookings:', e.message);
    process.exit(1);
  }
})();
