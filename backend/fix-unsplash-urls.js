
const mysql = require('mysql2/promise');
const { getPropertyImages } = require('./services/pexelsService');

async function fixUnsplashUrls() {
  try {
    console.log('Connecting to database...');
    const db = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'airbnb_clone',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Connected to database.');

    // Get all properties
    const [properties] = await db.query('SELECT id, property_name, property_type, location, photos FROM properties');
    console.log(`Found ${properties.length} properties.`);

    let updatedCount = 0;

    for (const property of properties) {
      let needsUpdate = false;
      let newPhotos = null;

      console.log(`\nChecking property ${property.id}: ${property.property_name}`);
      console.log(`Current photos: ${property.photos}`);

      // Check if photos field contains unsplash
      if (property.photos && property.photos.includes('unsplash')) {
        console.log(`  -> Found Unsplash URL in property ${property.id}`);
        needsUpdate = true;
      } else if (property.photos && property.photos.includes('picsum')) {
        console.log(`  -> Found Picsum URL in property ${property.id}`);
        needsUpdate = true;
      } else if (!property.photos || property.photos === '' || property.photos === 'null') {
        console.log(`  -> No photos for property ${property.id}`);
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`  -> Fetching Pexels images for ${property.property_type || 'house'} in ${property.location}...`);
        try {
          const pexelsImages = await getPropertyImages(property.property_type || 'house', property.location);
          newPhotos = JSON.stringify(pexelsImages);

          console.log(`  -> Updating with Pexels images: ${newPhotos.substring(0, 100)}...`);

          await db.query('UPDATE properties SET photos = ? WHERE id = ?', [newPhotos, property.id]);
          updatedCount++;
          console.log(`  -> ✓ Updated property ${property.id}`);

          // Add a small delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`  -> ✗ Error updating property ${property.id}:`, err.message);
        }
      } else {
        console.log(`  -> Property ${property.id} already has valid photos`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Update complete!`);
    console.log(`Total properties: ${properties.length}`);
    console.log(`Updated properties: ${updatedCount}`);
    console.log(`========================================`);

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUnsplashUrls();
