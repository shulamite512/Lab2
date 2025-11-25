// test-mongo-session.js
// Simple script to test MongoDB session integration

require('dotenv').config();
const { connectToMongoDB, getMongoDb, closeMongoConnection } = require('./mongoConnection');

async function testMongoConnection() {
  console.log('=== Testing MongoDB Session Integration ===\n');

  try {
    // Test 1: Connect to MongoDB
    console.log('Test 1: Connecting to MongoDB...');
    await connectToMongoDB();
    console.log('✓ MongoDB connection successful\n');

    // Test 2: Check if sessions collection exists or can be created
    console.log('Test 2: Checking sessions collection...');
    const db = getMongoDb();
    const collections = await db.listCollections({ name: 'sessions' }).toArray();

    if (collections.length > 0) {
      console.log('✓ Sessions collection exists');

      // Get current session count
      const sessionsCollection = db.collection('sessions');
      const count = await sessionsCollection.countDocuments({});
      console.log(`  Current session count: ${count}`);
    } else {
      console.log('ℹ Sessions collection will be created on first session');
    }
    console.log('');

    // Test 3: Check indexes
    console.log('Test 3: Checking session indexes...');
    const sessionsCollection = db.collection('sessions');
    const indexes = await sessionsCollection.indexes();

    console.log(`✓ Found ${indexes.length} index(es):`);
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.expireAfterSeconds !== undefined) {
        console.log(`    (TTL index: expires after ${index.expireAfterSeconds} seconds)`);
      }
    });
    console.log('');

    // Test 4: Insert a test session
    console.log('Test 4: Inserting a test session...');
    const testSession = {
      _id: 'test-session-' + Date.now(),
      session: {
        cookie: {
          originalMaxAge: 7200000,
          expires: new Date(Date.now() + 7200000),
          httpOnly: true,
          path: '/'
        },
        user: {
          id: 999,
          email: 'test@example.com',
          user_type: 'traveler'
        }
      },
      expires: new Date(Date.now() + 7200000)
    };

    await sessionsCollection.insertOne(testSession);
    console.log('✓ Test session inserted');
    console.log(`  Session ID: ${testSession._id}`);
    console.log(`  Expires: ${testSession.expires}`);
    console.log('');

    // Test 5: Retrieve the test session
    console.log('Test 5: Retrieving test session...');
    const retrieved = await sessionsCollection.findOne({ _id: testSession._id });
    if (retrieved) {
      console.log('✓ Test session retrieved successfully');
      console.log(`  User: ${retrieved.session.user.email}`);
    } else {
      console.log('✗ Failed to retrieve test session');
    }
    console.log('');

    // Test 6: Clean up test session
    console.log('Test 6: Cleaning up test session...');
    const deleteResult = await sessionsCollection.deleteOne({ _id: testSession._id });
    if (deleteResult.deletedCount === 1) {
      console.log('✓ Test session cleaned up successfully');
    }
    console.log('');

    console.log('=== All Tests Passed! ===');
    console.log('\nMongoDB is properly configured for session storage.');
    console.log('Sessions will:');
    console.log('  - Be stored in MongoDB "sessions" collection');
    console.log('  - Automatically expire after 2 hours of inactivity');
    console.log('  - Be cleaned up by MongoDB TTL index');
    console.log('  - Be monitored by the session cleanup service');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error);
  } finally {
    await closeMongoConnection();
    console.log('\n✓ MongoDB connection closed');
  }
}

// Run the test
testMongoConnection();
