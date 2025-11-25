// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===== AUTH MIDDLEWARE =====
const authenticate = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// ===== MULTER STORAGE CONFIG =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Only images are allowed!'));
    cb(null, true);
  }
});

// ===== PROPERTY PHOTO UPLOAD =====
router.post('/property/:propertyId', authenticate, upload.single('photo'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const propertyId = req.params.propertyId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const photoPath = `/uploads/${req.file.filename}`;

    // Append image path to property’s photos JSON column
    await db.query(
      'UPDATE properties SET photos = JSON_ARRAY_APPEND(COALESCE(photos, JSON_ARRAY()), "$", ?) WHERE id = ?',
      [photoPath, propertyId]
    );

    res.json({
      message: 'Property photo uploaded successfully',
      file: photoPath,
      url: photoPath
    });
  } catch (error) {
    console.error('Property upload error:', error);
    res.status(500).json({ error: 'Server error while uploading property photo' });
  }
});

// ===== PROFILE PICTURE UPLOAD =====
router.post('/profile', authenticate, upload.single('photo'), async (req, res) => {
  try {
    console.log('[UPLOAD] Profile upload started, userId:', req.session.userId);
    console.log('[UPLOAD] File received:', req.file ? req.file.filename : 'NO FILE');

    const db = req.app.locals.db;
    if (!req.file) {
      console.log('[UPLOAD] ERROR: No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    console.log('[UPLOAD] Updating database with path:', imagePath);

    await db.query('UPDATE users SET profile_picture = ? WHERE id = ?', [imagePath, req.session.userId]);

    console.log('[UPLOAD] Profile picture updated successfully');
    res.json({
      message: 'Profile picture updated successfully',
      file: imagePath,
      url: imagePath
    });
  } catch (error) {
    console.error('[UPLOAD] Profile upload error:', error);
    res.status(500).json({ error: 'Server error while uploading profile picture' });
  }
});

module.exports = router;
