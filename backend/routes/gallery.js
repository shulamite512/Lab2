// routes/gallery.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// List every image file currently in /uploads
router.get('/all', (req, res) => {
  const dir = path.join(__dirname, '../uploads');
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Gallery read error:', err);
      return res.status(500).json({ error: 'Cannot read uploads folder' });
    }
    // Filter only typical image extensions (optional)
    const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
    const images = files
      .filter(f => allowed.has(path.extname(f).toLowerCase()))
      .map(f => `/uploads/${f}`); // public URL

    res.json({ images });
  });
});

module.exports = router;
