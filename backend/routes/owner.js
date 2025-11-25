// routes/owner.js
const express = require('express');
const router = express.Router();
const { getPropertyImages } = require('../services/pexelsService');
const notificationService = require('../services/notificationService');

// Authentication middleware
const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.userType !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owners only.' });
  }
  next();
};

// Get owner profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users] = await db.query(
      'SELECT id, name, email, phone_number, location, profile_picture FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update owner profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone_number, location, profile_picture } = req.body;
    const db = req.app.locals.db;

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      values.push(phone_number);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      values.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.session.userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get owner's properties
router.get('/properties', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [properties] = await db.query(
      'SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC',
      [req.session.userId]
    );

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
        if (isPhotosEmpty(property.photos)) {
          const images = await getPropertyImages(property.property_type || 'house', property.property_name, property.location, property.id);
          property.photos = images;
        } else if (typeof property.photos === 'string') {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = Array.isArray(property.photos) ? property.photos : [String(property.photos)];
          }
        }
        return property;
      })
    );

    res.json({ properties: propertiesWithImages });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create property
router.post('/properties', authenticate, async (req, res) => {
  try {
    const {
      property_name,
      property_type,
      location,
      description,
      price_per_night,
      bedrooms,
      bathrooms,
      max_guests,
      amenities,
      photos,
      availability_start,
      availability_end,
      street_address,
      city,
      state,
      zip_code,
      check_in_time,
      check_out_time
    } = req.body;

    // Validation
    if (!property_name || !property_type || !location || !price_per_night || !bedrooms || !bathrooms || !max_guests) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    // Generate images if not provided
    let propertyPhotos = photos;
    if (!propertyPhotos || (Array.isArray(propertyPhotos) && propertyPhotos.length === 0)) {
      // Use timestamp as seed for unique images since property doesn't have ID yet
      const generatedImages = await getPropertyImages(property_type, property_name, location, Date.now());
      propertyPhotos = JSON.stringify(generatedImages);
    } else if (Array.isArray(propertyPhotos)) {
      propertyPhotos = JSON.stringify(propertyPhotos);
    }

    const db = req.app.locals.db;
    const [result] = await db.query(
      `INSERT INTO properties
       (owner_id, property_name, property_type, location, description, price_per_night,
        bedrooms, bathrooms, max_guests, amenities, photos, availability_start, availability_end,
        street_address, city, state, zip_code, check_in_time, check_out_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        property_name,
        property_type,
        location,
        description || null,
        price_per_night,
        bedrooms,
        bathrooms,
        max_guests,
        amenities || null,
        propertyPhotos,
        availability_start || null,
        availability_end || null,
        street_address || null,
        city || null,
        state || null,
        zip_code || null,
        check_in_time || '15:00:00',
        check_out_time || '11:00:00'
      ]
    );

    res.status(201).json({
      message: 'Property created successfully',
      propertyId: result.insertId
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update property
router.put('/properties/:propertyId', authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const db = req.app.locals.db;

    // Verify ownership
    const [properties] = await db.query(
      'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
      [propertyId, req.session.userId]
    );

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found or access denied' });
    }

    const {
      property_name,
      property_type,
      location,
      description,
      price_per_night,
      bedrooms,
      bathrooms,
      max_guests,
      amenities,
      photos,
      availability_start,
      availability_end,
      is_active,
      street_address,
      city,
      state,
      zip_code,
      check_in_time,
      check_out_time
    } = req.body;

    const updates = [];
    const values = [];

    if (property_name) {
      updates.push('property_name = ?');
      values.push(property_name);
    }
    if (property_type) {
      updates.push('property_type = ?');
      values.push(property_type);
    }
    if (location) {
      updates.push('location = ?');
      values.push(location);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price_per_night) {
      updates.push('price_per_night = ?');
      values.push(price_per_night);
    }
    if (bedrooms) {
      updates.push('bedrooms = ?');
      values.push(bedrooms);
    }
    if (bathrooms) {
      updates.push('bathrooms = ?');
      values.push(bathrooms);
    }
    if (max_guests) {
      updates.push('max_guests = ?');
      values.push(max_guests);
    }
    if (amenities !== undefined) {
      updates.push('amenities = ?');
      values.push(amenities);
    }
    if (photos !== undefined) {
      updates.push('photos = ?');
      values.push(photos);
    }
    if (availability_start !== undefined) {
      updates.push('availability_start = ?');
      values.push(availability_start);
    }
    if (availability_end !== undefined) {
      updates.push('availability_end = ?');
      values.push(availability_end);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (street_address !== undefined) {
      updates.push('street_address = ?');
      values.push(street_address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (zip_code !== undefined) {
      updates.push('zip_code = ?');
      values.push(zip_code);
    }
    if (check_in_time !== undefined) {
      updates.push('check_in_time = ?');
      values.push(check_in_time || '15:00:00');
    }
    if (check_out_time !== undefined) {
      updates.push('check_out_time = ?');
      values.push(check_out_time || '11:00:00');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(propertyId);

    await db.query(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete property
router.delete('/properties/:propertyId', authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const db = req.app.locals.db;

    // Verify ownership
    const [properties] = await db.query(
      'SELECT id FROM properties WHERE id = ? AND owner_id = ?',
      [propertyId, req.session.userId]
    );

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found or access denied' });
    }

    // Delete the property (CASCADE will handle related records)
    await db.query('DELETE FROM properties WHERE id = ?', [propertyId]);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dashboard data (recent bookings and requests)
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get recent booking requests
    const [requests] = await db.query(
      `SELECT b.*, p.property_name, u.name as traveler_name, u.email as traveler_email 
       FROM bookings b 
       JOIN properties p ON b.property_id = p.id 
       JOIN users u ON b.traveler_id = u.id 
       WHERE b.owner_id = ? AND b.status = 'PENDING'
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [req.session.userId]
    );

    // Get previous bookings
    const [previousBookings] = await db.query(
      `SELECT b.*, p.property_name, u.name as traveler_name 
       FROM bookings b 
       JOIN properties p ON b.property_id = p.id 
       JOIN users u ON b.traveler_id = u.id 
       WHERE b.owner_id = ? AND b.status IN ('ACCEPTED', 'CANCELLED')
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [req.session.userId]
    );

    // Return keys expected by the frontend OwnerDashboardPage
        res.json({
          pendingRequests: requests,
          previousBookings
        });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SSE endpoint for owner notifications
router.get('/notifications/stream', authenticate, (req, res) => {
  // Only owners should subscribe
  if (req.session.userType !== 'owner') {
    return res.status(403).end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('\n');

  notificationService.register(req.session.userId, res);
});

// Debug: show number of SSE clients registered for this owner (test-only)
router.get('/notifications/debug', authenticate, (req, res) => {
  try {
    if (req.session.userType !== 'owner') return res.status(403).json({ error: 'Owners only' });
    const count = notificationService.getClientCount(req.session.userId);
    res.json({ connected: count });
  } catch (err) {
    console.error('Notifications debug error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;