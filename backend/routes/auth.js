// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getMongoDb } = require('../mongoConnection');

// Get client IP from headers (nginx proxy) or socket fallback
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Remove any existing sessions for the user so only one active login exists
async function pruneUserSessions(userId, currentIp) {
  try {
    const db = getMongoDb();
    const sessions = db.collection('sessions');
    const query = {
      $or: [
        { 'session.userId': userId },
        { 'session.userId': String(userId) },
        { 'session.user.id': userId },
        { 'session.user.id': String(userId) }
      ]
    };

    const existing = await sessions.find(query).project({ 'session.ipAddress': 1 }).toArray();
    const total = existing.length;
    const differentIp = existing.filter((s) => s.session?.ipAddress && s.session.ipAddress !== currentIp).length;

    const result = await sessions.deleteMany(query);
    if (result.deletedCount > 0) {
      console.log(`[SESSION] Removed ${result.deletedCount} old session(s) for user ${userId} (different IPs: ${differentIp}/${total}, current IP: ${currentIp || 'n/a'})`);
    }
  } catch (err) {
    console.error(`[SESSION] Failed to prune sessions for user ${userId}:`, err.message);
  }
}

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, user_type, location } = req.body;

    // Validation
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['traveler', 'owner'].includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const db = req.app.locals.db;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, user_type, location) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, user_type, location || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId,
      user_type
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt`, {
      email,
      hasPassword: Boolean(password),
      bodyType: typeof req.body,
      rawBodyKeys: Object.keys(req.body || {})
    });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = req.app.locals.db;

    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.warn(`[AUTH] Unknown email`, email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.warn(`[AUTH] Invalid password for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const clientIp = getClientIp(req);

    // Regenerate session to avoid fixation and ensure a single active session per user
    req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        console.error('Session regenerate error during login:', regenErr);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      await pruneUserSessions(user.id, clientIp);

      req.session.userId = user.id;
      req.session.userType = user.user_type;
      req.session.ipAddress = clientIp;

      // Remove password from response
      delete user.password;

      // Save session and send response after it's persisted so we can confirm
      req.session.save((err) => {
        if (err) {
          console.error('Session save error during login:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }
        // Log session id for debugging in dev
        try {
          console.log(`Session created: id=${req.sessionID} userId=${req.session.userId}`);
        } catch (e) {
          // ignore logging errors
        }
        res.json({
          message: 'Login successful',
          user
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = req.app.locals.db;
    const [users] = await db.query(
      'SELECT id, name, email, user_type, phone_number, about_me, city, country, languages, gender, profile_picture, location FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
