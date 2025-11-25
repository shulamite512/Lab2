// mongoConnection.js
const { MongoClient } = require('mongodb');

let mongoClient = null;
let db = null;

const connectToMongoDB = async () => {
  if (mongoClient) {
    return { client: mongoClient, db };
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb_clone';

    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await mongoClient.connect();

    // Extract database name from URI or use default
    const dbName = mongoUri.split('/').pop().split('?')[0] || 'airbnb_clone';
    db = mongoClient.db(dbName);

    console.log(`✓ Connected to MongoDB database: ${dbName}`);

    // Setup indexes for session collection
    await setupSessionIndexes();

    return { client: mongoClient, db };
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
};

const setupSessionIndexes = async () => {
  try {
    const sessionsCollection = db.collection('sessions');

    // Create TTL index to automatically delete expired sessions
    // Sessions will be automatically removed after they expire
    await sessionsCollection.createIndex(
      { "expires": 1 },
      { expireAfterSeconds: 0, background: true }
    );

    console.log('✓ MongoDB session indexes created');
  } catch (error) {
    console.error('✗ Error creating session indexes:', error.message);
  }
};

const getMongoClient = () => {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized. Call connectToMongoDB first.');
  }
  return mongoClient;
};

const getMongoDb = () => {
  if (!db) {
    throw new Error('MongoDB database not initialized. Call connectToMongoDB first.');
  }
  return db;
};

const closeMongoConnection = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    console.log('✓ MongoDB connection closed');
  }
};

module.exports = {
  connectToMongoDB,
  getMongoClient,
  getMongoDb,
  closeMongoConnection
};
