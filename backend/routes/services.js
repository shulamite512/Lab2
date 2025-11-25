// routes/services.js
const express = require('express');
const router = express.Router();

// POST /api/services/requests
// Expects { service_id, name, email, message }
router.post('/requests', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { service_id, name, email, message } = req.body;

    if (!service_id || !name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.execute(
      `INSERT INTO services_requests (service_id, name, email, message, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [service_id, name, email, message]
    );

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Service request error:', err);
    return res.status(500).json({ error: 'Could not save service request' });
  }
});

module.exports = router;
