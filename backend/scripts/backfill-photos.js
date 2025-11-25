const mysql = require('mysql2/promise');
const { getPropertyImages } = require('../services/pexelsService');

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

    console.log('Connected to DB for backfill');

    const [rows] = await db.query('SELECT id, property_type, property_name, location, photos FROM properties');

    let updated = 0;

    for (const row of rows) {
      const { id, property_type, property_name, location, photos } = row;

      const isEmpty = (() => {
        if (!photos) return true;
        if (typeof photos === 'string') {
          const t = photos.trim();
          return t === '' || t === '[]' || t === 'null';
        }
        if (Array.isArray(photos)) return photos.length === 0;
        if (typeof photos === 'object') return Object.keys(photos).length === 0;
        return false;
      })();

      if (isEmpty) {
        console.log(`Generating images for property ${id} (${property_name})`);
        const images = await getPropertyImages(property_type || 'house', property_name, location, id);
        try {
          await db.query('UPDATE properties SET photos = ? WHERE id = ?', [JSON.stringify(images), id]);
          updated++;
          console.log(`Updated property ${id} with ${images.length} images`);
        } catch (e) {
          console.error(`Failed to update property ${id}:`, e.message);
        }
      }
    }

    console.log(`Backfill complete. Updated ${updated} properties.`);
    await db.end();
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e);
    process.exit(1);
  }
})();
