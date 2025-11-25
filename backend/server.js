// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const uploadRoutes = require('./routes/upload');
const galleryRoutes = require('./routes/gallery');
const { connectToMongoDB } = require('./mongoConnection');





// Create Express app
const app = express();
const sessionSecure = process.env.SESSION_SECURE === 'true';
const sessionSameSite = process.env.SESSION_SAMESITE || (sessionSecure ? 'none' : 'lax');

// Behind nginx in docker-compose; trust proxy so secure cookies work when enabled
app.set('trust proxy', 1);

//  CORS CONFIGURATION
// Allow requests from frontend (React)
// Configure CORS to allow the Vite dev server (typically on 5173) and the React port (3000).
// This also supports an environment variable FRONTEND_URL and an option to allow all origins for dev.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  // Include nginx-served frontend on port 80
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176'
];
const allowAll = process.env.ALLOW_ALL_CORS === 'true';

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowAll) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true
}));

// MIDDLEWARE 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  SESSION CONFIGURATION
// MongoDB session store will be configured after MongoDB connects
let sessionMiddleware;


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ====== DATABASE CONNECTIONS (MySQL & MongoDB) ======
async function ensureDefaultUsers(db) {
  const defaults = [
    {
      name: 'Test Owner',
      email: process.env.DEFAULT_OWNER_EMAIL || 'owner@test.com',
      password: process.env.DEFAULT_OWNER_PASSWORD || 'password123',
      user_type: 'owner',
      location: 'New York'
    },
    {
      name: 'Harry Owner',
      email: process.env.JMETER_EMAIL || 'harry@gmail.com',
      password: process.env.JMETER_PASSWORD || 'haryairbnb@123',
      user_type: 'owner',
      location: 'Los Angeles'
    }
  ];

  for (const user of defaults) {
    const [rows] = await db.query('SELECT id, password FROM users WHERE email = ?', [user.email]);

    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query(
        'INSERT INTO users (name, email, password, user_type, location) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, hashedPassword, user.user_type, user.location]
      );
      console.log(`✓ Created default user ${user.email}`);
      continue;
    }

    const storedPassword = rows[0].password || '';
    const storedIsBcrypt = storedPassword.startsWith('$2');
    let matches = false;

    if (storedIsBcrypt) {
      matches = await bcrypt.compare(user.password, storedPassword);
    } else {
      matches = storedPassword === user.password;
    }

    if (!matches || !storedIsBcrypt) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query(
        'UPDATE users SET name = ?, user_type = ?, location = ?, password = ? WHERE email = ?',
        [user.name, user.user_type, user.location, hashedPassword, user.email]
      );
      console.log(`✓ Updated credentials for ${user.email}`);
    }
  }

  console.log('✓ Default test users ready for authentication flows');
}

const initDB = async () => {
  try {
    // Connect to MongoDB first for session store
    await connectToMongoDB();

    // Configure MongoDB session store
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb_clone';
    console.log('Using MongoDB URI for sessions:', mongoUri);

    sessionMiddleware = session({
      name: 'connect.sid',
      secret: process.env.SESSION_SECRET || 'supersecretkey',
      resave: false,
      saveUninitialized: true,
      store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions',
        ttl: 60 * 60 * 8 // 8 hours in seconds
      }),
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
        path: '/'
      }
    });

    // Apply session middleware
    app.use(sessionMiddleware);

    // Session debugging
    app.use((req, res, next) => {
      try {
        const sid = req.sessionID || 'no-sessionID';
        const uid = req.session ? req.session.userId : 'no-userId';
        const cookie = req.headers.cookie || 'no-cookie';
        console.log(`[SESSION] ${req.method} ${req.url} | sessionID=${sid} | userId=${uid} | cookie=${cookie.substring(0, 50)}...`);
      } catch (e) {
        console.error('[SESSION] Debug error:', e.message);
      }
      next();
    });

    console.log('✓ MongoDB session store configured');

    // Connect to MySQL
    const db = await mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'airbnb_clone',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Make db accessible in all routes
    app.locals.db = db;
    console.log(`✓ Connected to MySQL database at ${process.env.MYSQL_HOST || 'localhost'}`);

    await ensureDefaultUsers(db);

    // ====== ROUTE IMPORTS ======
    const authRoutes = require('./routes/auth');
    const travelerRoutes = require('./routes/traveler');
    const ownerRoutes = require('./routes/owner');
    const propertyRoutes = require('./routes/property');
    const bookingRoutes = require('./routes/booking');
    const servicesRoutes = require('./routes/services');
    const aiRoutes = require('./routes/ai');

    // ====== ROUTE MOUNTING ======
    // Lightweight health endpoint for k8s probes
    app.get('/health', (req, res) => res.status(200).send('ok'));

    app.use('/api/auth', authRoutes);
    app.use('/api/traveler', travelerRoutes);
    app.use('/api/owner', ownerRoutes);
    app.use('/api/properties', propertyRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/services', servicesRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/gallery', galleryRoutes);

    // Root route for quick check
    app.get('/', (req, res) => {
      res.send(' Airbnb Clone Backend is running successfully!');
    });

    // ====== START SERVER ======
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error(' Database connection failed:', error);
    process.exit(1);
  }
};

// Initialize DB + start server
initDB();
