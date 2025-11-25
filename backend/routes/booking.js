// routes/booking.js
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { publishBookingEvent } = require('../services/kafkaService');

// Authentication middleware
const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Create booking (Traveler only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.session.userType !== 'traveler') {
      return res.status(403).json({ error: 'Only travelers can create bookings' });
    }

    const { property_id, start_date, end_date, number_of_guests } = req.body;

    // Validation
    if (!property_id || !start_date || !end_date || !number_of_guests) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = req.app.locals.db;

    // Get property details and verify it exists
    const [properties] = await db.query(
      'SELECT * FROM properties WHERE id = ? AND is_active = TRUE',
      [property_id]
    );

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found or not available' });
    }

    const property = properties[0];

    // Check if property can accommodate the guests
    if (number_of_guests > property.max_guests) {
      return res.status(400).json({ error: 'Number of guests exceeds property capacity' });
    }

    // Check if dates are available
    const [conflicts] = await db.query(
      `SELECT id FROM blocked_dates 
       WHERE property_id = ? 
       AND ((start_date <= ? AND end_date >= ?)
          OR (start_date <= ? AND end_date >= ?)
          OR (start_date >= ? AND end_date <= ?))`,
      [property_id, end_date, start_date, end_date, end_date, start_date, end_date]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Property is not available for selected dates' });
    }

    // Calculate total price
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const total_price = nights * property.price_per_night;

    // Create booking
    const [result] = await db.query(
      `INSERT INTO bookings 
       (property_id, traveler_id, owner_id, start_date, end_date, number_of_guests, total_price, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [property_id, req.session.userId, property.owner_id, start_date, end_date, number_of_guests, total_price]
    );

    // Notify owner via SSE if connected
    try {
      const notifyResult = notificationService.sendNotification(property.owner_id, 'new_booking', {
        bookingId: result.insertId,
        property_id,
        traveler_id: req.session.userId,
        start_date,
        end_date,
        total_price
      });
      console.log(`Notification send attempted for owner ${property.owner_id}, booking ${result.insertId}, delivered=${notifyResult}`);
    } catch (e) {
      // ignore notification errors
    }

    publishBookingEvent({
      event: 'booking_created',
      bookingId: result.insertId,
      property_id,
      owner_id: property.owner_id,
      traveler_id: req.session.userId,
      start_date,
      end_date,
      total_price,
      nights,
      status: 'PENDING'
    }).then((sent) => {
      if (!sent) {
        console.warn(`[Kafka] Booking ${result.insertId} event not sent`);
      }
    }).catch((err) => {
      console.error('[Kafka] Unexpected publish error:', err.message);
    });

    res.status(201).json({
      message: 'Booking request created successfully',
      bookingId: result.insertId,
      status: 'PENDING',
      total_price
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const db = req.app.locals.db;

    let query;
    let params = [req.session.userId];

    if (req.session.userType === 'traveler') {
      query = `
        SELECT b.*, p.property_name, p.location, p.photos, u.name as owner_name
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        JOIN users u ON b.owner_id = u.id
        WHERE b.traveler_id = ?
      `;
    } else {
      query = `
        SELECT b.*, p.property_name, p.location, u.name as traveler_name, u.email as traveler_email
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        JOIN users u ON b.traveler_id = u.id
        WHERE b.owner_id = ?
      `;
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY b.created_at DESC';

    const [bookings] = await db.query(query, params);

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking by ID
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = req.app.locals.db;

    const [bookings] = await db.query(
      `SELECT b.*, p.property_name, p.location, p.photos, p.amenities,
              owner.name as owner_name, owner.email as owner_email,
              traveler.name as traveler_name, traveler.email as traveler_email
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users owner ON b.owner_id = owner.id
       JOIN users traveler ON b.traveler_id = traveler.id
       WHERE b.id = ? AND (b.traveler_id = ? OR b.owner_id = ?)`,
      [bookingId, req.session.userId, req.session.userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    res.json({ booking: bookings[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept booking (Owner only)
router.put('/:bookingId/accept', authenticate, async (req, res) => {
  try {
    if (req.session.userType !== 'owner') {
      return res.status(403).json({ error: 'Only owners can accept bookings' });
    }

    const { bookingId } = req.params;
    const db = req.app.locals.db;

    // Get booking details
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND owner_id = ? AND status = "PENDING"',
      [bookingId, req.session.userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found, already processed, or access denied' });
    }

    const booking = bookings[0];

    // Check for date conflicts one more time
    const [conflicts] = await db.query(
      `SELECT id FROM blocked_dates 
       WHERE property_id = ? 
       AND ((start_date <= ? AND end_date >= ?)
          OR (start_date <= ? AND end_date >= ?)
          OR (start_date >= ? AND end_date <= ?))`,
      [booking.property_id, booking.end_date, booking.start_date, 
       booking.end_date, booking.end_date, booking.start_date, booking.end_date]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Dates are no longer available' });
    }

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Update booking status
      await db.query(
        'UPDATE bookings SET status = "ACCEPTED" WHERE id = ?',
        [bookingId]
      );

      // Block dates
      await db.query(
        'INSERT INTO blocked_dates (property_id, booking_id, start_date, end_date) VALUES (?, ?, ?, ?)',
        [booking.property_id, bookingId, booking.start_date, booking.end_date]
      );

      await db.query('COMMIT');

      publishBookingEvent({
        event: 'booking_accepted',
        bookingId,
        property_id: booking.property_id,
        owner_id: booking.owner_id,
        traveler_id: booking.traveler_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_price: booking.total_price,
        status: 'ACCEPTED'
      }).then((sent) => {
        if (!sent) {
          console.warn(`[Kafka] Booking ${bookingId} acceptance event not sent`);
        }
      }).catch((err) => {
        console.error('[Kafka] Unexpected publish error:', err.message);
      });

      res.json({ message: 'Booking accepted successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel booking (Owner or Traveler)
router.put('/:bookingId/cancel', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = req.app.locals.db;

    // Get booking details
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND (owner_id = ? OR traveler_id = ?)',
      [bookingId, req.session.userId, req.session.userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    const booking = bookings[0];

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Update booking status
      await db.query(
        'UPDATE bookings SET status = "CANCELLED" WHERE id = ?',
        [bookingId]
      );

      // Release blocked dates if booking was accepted
      if (booking.status === 'ACCEPTED') {
        await db.query(
          'DELETE FROM blocked_dates WHERE booking_id = ?',
          [bookingId]
        );
      }

      await db.query('COMMIT');

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;