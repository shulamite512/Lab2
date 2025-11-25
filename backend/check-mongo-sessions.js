// check-mongo-sessions.js
// Quick script to show how sessions are stored in MongoDB

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function showSessions() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb_clone';

  console.log('📊 Connecting to MongoDB to check sessions...\n');
  console.log(`🔗 Connection: ${mongoUri}\n`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('airbnb_clone');
    const sessionsCollection = db.collection('sessions');

    // Count sessions
    const total = await sessionsCollection.countDocuments({});
    const active = await sessionsCollection.countDocuments({
      expires: { $gte: new Date() }
    });

    console.log('📈 Session Statistics:');
    console.log(`   Total sessions: ${total}`);
    console.log(`   Active sessions: ${active}`);
    console.log(`   Expired sessions: ${total - active}\n`);

    // Show sample sessions (limit to 3)
    console.log('📝 Sample Sessions:\n');
    const samples = await sessionsCollection.find({}).limit(3).toArray();

    if (samples.length === 0) {
      console.log('   No sessions found. Log in to create a session!\n');
    } else {
      samples.forEach((session, idx) => {
        console.log(`   Session ${idx + 1}:`);
        console.log(`   - ID: ${session._id}`);
        console.log(`   - Expires: ${session.expires}`);
        console.log(`   - User: ${session.session?.user?.email || 'Not logged in'}`);
        console.log(`   - Type: ${session.session?.user?.user_type || 'N/A'}`);
        console.log('');
      });
    }

    console.log('💡 To see sessions in real-time:');
    console.log('   docker exec -it airbnb-mongodb mongosh');
    console.log('   use airbnb_clone');
    console.log('   db.sessions.find()');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('✅ Connection closed');
  }
}

showSessions();
