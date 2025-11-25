# MongoDB Session Storage Implementation

## Overview
This implementation integrates MongoDB for storing user sessions in the Airbnb Clone backend. Sessions are now persisted in MongoDB instead of in-memory storage, providing better scalability and session management across server restarts.

## What Was Implemented

### 1. MongoDB Session Storage
- **Location**: [mongoConnection.js](mongoConnection.js)
- User sessions are now stored in MongoDB's `sessions` collection
- Automatic TTL (Time-To-Live) index ensures expired sessions are automatically deleted
- Connection pooling for efficient database operations

### 2. Session Configuration
- **Location**: [server.js](server.js:75-96)
- Sessions expire after **2 hours** of inactivity
- MongoDB automatically removes expired sessions using TTL indexes
- Sessions are encrypted using the `SESSION_SECRET` environment variable

### 3. Automatic Session Cleanup
- **Location**: [services/sessionCleanup.js](services/sessionCleanup.js)
- Background service runs every hour to clean up expired sessions
- Provides session statistics and monitoring capabilities
- Logs cleanup operations for debugging

### 4. Session Statistics Endpoint
- **Endpoint**: `GET /api/sessions/stats`
- Returns information about active and expired sessions
- Useful for monitoring and debugging

## Key Features

### Automatic Expiration
- Sessions automatically expire after **2 hours** of inactivity
- MongoDB's TTL index removes expired sessions from the database
- No manual cleanup required (handled automatically)

### Session Persistence
- Sessions survive server restarts
- Users remain logged in across deployments (until session expires)
- Better user experience in production environments

### Scalability
- Sessions stored in MongoDB instead of server memory
- Multiple backend instances can share the same session store
- Horizontal scaling support

## Files Created/Modified

### Created:
1. [mongoConnection.js](mongoConnection.js) - MongoDB connection management
2. [services/sessionCleanup.js](services/sessionCleanup.js) - Session cleanup service
3. [test-mongo-session.js](test-mongo-session.js) - Test script for MongoDB session integration

### Modified:
1. [server.js](server.js) - Integrated MongoDB session store
2. [package.json](package.json) - Added `mongodb` and `connect-mongo` dependencies

## Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://mongodb:27017/airbnb_clone
SESSION_SECRET=supersecretkey_production_change_this
```

### Session Settings
- **TTL**: 2 hours (7200 seconds)
- **Cookie Max Age**: 2 hours (7200000 milliseconds)
- **Cleanup Interval**: Every 1 hour
- **Auto-remove Strategy**: Native MongoDB TTL index

## How It Works

### 1. User Login Flow
```
User logs in → Session created → Stored in MongoDB → Cookie sent to browser
```

### 2. Session Validation
```
Request received → Cookie read → Session fetched from MongoDB → User authenticated
```

### 3. Session Expiration
```
2 hours of inactivity → Session expires → MongoDB TTL index removes it → User logged out
```

### 4. Session Cleanup
```
Every hour → Cleanup service runs → Removes expired sessions → Logs statistics
```

## Monitoring

### Check Session Statistics
```bash
curl http://localhost:3000/api/sessions/stats
```

Response example:
```json
{
  "total": 150,
  "active": 120,
  "expired": 30,
  "byType": [
    { "_id": "traveler", "count": 80 },
    { "_id": "owner", "count": 40 }
  ]
}
```

### View MongoDB Sessions Directly
```bash
# Connect to MongoDB container
docker exec -it airbnb-mongodb mongosh

# Switch to database
use airbnb_clone

# View all sessions
db.sessions.find()

# Count active sessions
db.sessions.countDocuments({ expires: { $gte: new Date() } })

# View sessions for a specific user
db.sessions.find({ "session.user.email": "user@example.com" })
```

## Testing

Run the test script to verify MongoDB session integration:
```bash
cd backend
node test-mongo-session.js
```

Expected output:
- ✓ MongoDB connection successful
- ✓ Sessions collection exists
- ✓ TTL indexes created
- ✓ Test session CRUD operations work

## Benefits

1. **Persistence**: Sessions survive server restarts
2. **Scalability**: Support for multiple backend instances
3. **Automatic Cleanup**: Expired sessions removed automatically
4. **Monitoring**: Session statistics endpoint for observability
5. **Security**: Encrypted session data with SESSION_SECRET
6. **Performance**: Connection pooling and efficient indexing

## Production Considerations

1. **Change SESSION_SECRET**: Use a strong, random secret in production
2. **Enable HTTPS**: Set `SESSION_SECURE=true` for secure cookies
3. **Monitor Session Count**: Watch for session leaks or unusual patterns
4. **Backup MongoDB**: Include sessions collection in backup strategy
5. **Scale MongoDB**: Use MongoDB replica sets for high availability

## Troubleshooting

### Sessions Not Persisting
- Check `MONGODB_URI` environment variable
- Verify MongoDB container is running: `docker ps | grep mongodb`
- Check MongoDB logs: `docker logs airbnb-mongodb`

### Sessions Not Expiring
- Verify TTL index exists: `db.sessions.getIndexes()`
- Check cleanup service is running (check server logs)
- Ensure server time is synchronized

### Connection Errors
- Verify MongoDB is accessible on port 27017
- Check network connectivity between containers
- Review MongoDB connection pool settings

## Next Steps

Consider implementing:
1. **Session Analytics**: Track login patterns and user behavior
2. **Session Revocation**: Admin endpoint to force logout users
3. **Multi-factor Authentication**: Enhanced session security
4. **Session Migration**: Transfer sessions between environments
