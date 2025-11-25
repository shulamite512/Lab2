// routes/property.js
const express = require('express');
const router = express.Router();
const { getPropertyImages } = require('../services/pexelsService');

// Helper to detect empty/invalid photos values (string '[]', empty array, null, empty object)
function isPhotosEmpty(p) {
  if (!p) return true;
  if (typeof p === 'string') {
    const t = p.trim();
    return t === '' || t === '[]' || t === 'null';
  }
  if (Array.isArray(p)) return p.length === 0;
  if (typeof p === 'object') return Object.keys(p).length === 0;
  return false;
}

// Search properties (available to all users)
router.get('/search', async (req, res) => {
  try {
    const { location, start_date, end_date, guests } = req.query;
    const db = req.app.locals.db;

    let query = `
      SELECT p.*, u.name as owner_name, u.profile_picture as owner_picture
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.is_active = TRUE
    `;
    const params = [];

    // Filter by location
    if (location) {
      query += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    // Filter by number of guests
    if (guests) {
      query += ' AND p.max_guests >= ?';
      params.push(parseInt(guests));
    }

    // Filter by availability dates
    if (start_date && end_date) {
      query += ` AND p.id NOT IN (
        SELECT property_id FROM blocked_dates 
        WHERE (start_date <= ? AND end_date >= ?)
           OR (start_date <= ? AND end_date >= ?)
           OR (start_date >= ? AND end_date <= ?)
      )`;
      params.push(end_date, start_date, end_date, end_date, start_date, end_date);
    }

    query += ' ORDER BY p.created_at DESC';

    const [properties] = await db.query(query, params);

    // Add images to properties that don't have them
    const propertiesWithImages = await Promise.all(
      properties.map(async (property) => {
        if (!property.photos || (Array.isArray(property.photos) && property.photos.length === 0)) {
          // Generate images based on property type
          const images = await getPropertyImages(property.property_type || 'house', property.property_name, property.location, property.id);
          property.photos = images;
        } else if (typeof property.photos === 'string') {
          // Parse JSON string if needed
          property.photos = JSON.parse(property.photos);
        }
        return property;
      })
    );

    res.json({ properties: propertiesWithImages });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get property details by ID
router.get('/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const db = req.app.locals.db;

    const [properties] = await db.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.profile_picture as owner_picture, u.phone_number as owner_phone
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [propertyId]
    );

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get blocked dates for this property
    const [blockedDates] = await db.query(
      'SELECT start_date, end_date FROM blocked_dates WHERE property_id = ?',
      [propertyId]
    );

    // Add images if property doesn't have them; persist generated images so they show consistently
    let property = properties[0];
    if (isPhotosEmpty(property.photos)) {
      console.log(`[GET /api/properties/:id] photos empty for property ${propertyId}, generating images`);
      const images = await getPropertyImages(property.property_type || 'house', property.property_name, property.location, property.id);
      property.photos = images;
      try {
        // Persist generated images as JSON so subsequent requests don't re-query Pexels
        await db.query('UPDATE properties SET photos = ? WHERE id = ?', [JSON.stringify(images), propertyId]);
        console.log(`[GET /api/properties/:id] persisted generated images for property ${propertyId}`);
      } catch (dbErr) {
        console.error('Failed to persist generated images for property', propertyId, dbErr.message);
      }
    } else if (typeof property.photos === 'string') {
      try {
        property.photos = JSON.parse(property.photos);
      } catch (e) {
        property.photos = Array.isArray(property.photos) ? property.photos : [String(property.photos)];
      }
    }

    res.json({
      property,
      blockedDates
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all properties (for browsing)
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/properties] Request received');
    const db = req.app.locals.db;

    if (!db) {
      console.error('[GET /api/properties] Database connection not available');
      return res.status(500).json({ error: 'Database connection not available' });
    }

    console.log('[GET /api/properties] Querying database...');
    const [properties] = await db.query(
      `SELECT p.*, u.name as owner_name
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.is_active = TRUE
       ORDER BY p.created_at DESC
       LIMIT 50`
    );

    console.log(`[GET /api/properties] Found ${properties.length} properties`);

    // Helper to detect empty/invalid photos values (string '[]', empty array, null, empty object)
    const isPhotosEmpty = (p) => {
      if (!p) return true;
      if (typeof p === 'string') {
        const t = p.trim();
        return t === '' || t === '[]' || t === 'null';
      }
      if (Array.isArray(p)) return p.length === 0;
      if (typeof p === 'object') return Object.keys(p).length === 0;
      return false;
    };

    // Add images to properties that don't have them
    const propertiesWithImages = await Promise.all(
      properties.map(async (property) => {
        try {
          if (isPhotosEmpty(property.photos)) {
            console.log(`[GET /api/properties] Fetching images for property ${property.id}`);
            const images = await getPropertyImages(
              property.property_type || 'house',
              property.property_name,
              property.location,
              property.id
            );
            property.photos = images;
          } else if (typeof property.photos === 'string') {
            // Stored as JSON string in DB
            try {
              property.photos = JSON.parse(property.photos);
            } catch (e) {
              property.photos = Array.isArray(property.photos) ? property.photos : [String(property.photos)];
            }
          }
          return property;
        } catch (imgError) {
          console.error(`[GET /api/properties] Error processing property ${property.id}:`, imgError);
          // Return property with fallback image
          property.photos = ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'];
          return property;
        }
      })
    );

    console.log('[GET /api/properties] Sending response with properties');
    res.json({ properties: propertiesWithImages });
  } catch (error) {
    console.error('[GET /api/properties] Error:', error);
    console.error('[GET /api/properties] Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;