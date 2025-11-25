// routes/traveler.js
const express = require('express');
const router = express.Router();

// Authentication middleware
const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.userType !== 'traveler') {
    return res.status(403).json({ error: 'Access denied. Travelers only.' });
  }
  next();
};

// Get traveler profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users] = await db.query(
      'SELECT id, name, email, phone_number, about_me, city, country, languages, gender, profile_picture FROM users WHERE id = ?',
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

// Update traveler profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone_number, about_me, city, country, languages, gender, profile_picture } = req.body;
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
    if (about_me !== undefined) {
      updates.push('about_me = ?');
      values.push(about_me);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (languages !== undefined) {
      updates.push('languages = ?');
      values.push(languages);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
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

// Get favorites
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [favorites] = await db.query(
      `SELECT p.*, u.name as owner_name 
       FROM favorites f 
       JOIN properties p ON f.property_id = p.id 
       JOIN users u ON p.owner_id = u.id 
       WHERE f.traveler_id = ? AND p.is_active = TRUE`,
      [req.session.userId]
    );

    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to favorites
router.post('/favorites/:propertyId', authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const db = req.app.locals.db;

    // Check if property exists
    const [properties] = await db.query(
      'SELECT id FROM properties WHERE id = ?',
      [propertyId]
    );

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Add to favorites (ignore if already exists)
    await db.query(
      'INSERT IGNORE INTO favorites (traveler_id, property_id) VALUES (?, ?)',
      [req.session.userId, propertyId]
    );

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from favorites
router.delete('/favorites/:propertyId', authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const db = req.app.locals.db;

    await db.query(
      'DELETE FROM favorites WHERE traveler_id = ? AND property_id = ?',
      [req.session.userId, propertyId]
    );

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking history
router.get('/history', authenticate, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [bookings] = await db.query(
      `SELECT b.*, p.property_name, p.location, p.photos, u.name as owner_name 
       FROM bookings b 
       JOIN properties p ON b.property_id = p.id 
       JOIN users u ON b.owner_id = u.id 
       WHERE b.traveler_id = ? AND b.end_date < CURDATE()
       ORDER BY b.end_date DESC`,
      [req.session.userId]
    );

    res.json({ history: bookings });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;