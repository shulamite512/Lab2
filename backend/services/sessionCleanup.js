// services/sessionCleanup.js
const { getMongoDb } = require('../mongoConnection');

class SessionCleanupService {
  constructor() {
    this.intervalId = null;
    this.cleanupInterval = 60 * 60 * 1000; // Run cleanup every 1 hour
  }

  /**
   * Start the session cleanup service
   * This runs periodically to clean up expired sessions
   */
  start() {
    if (this.intervalId) {
      console.log('⚠ Session cleanup service is already running');
      return;
    }

    console.log('✓ Session cleanup service started');

    // Run cleanup immediately on start
    this.cleanupExpiredSessions();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Stop the session cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('✓ Session cleanup service stopped');
    }
  }

  /**
   * Manually trigger session cleanup
   */
  async cleanupExpiredSessions() {
    try {
      const db = getMongoDb();
      const sessionsCollection = db.collection('sessions');

      // MongoDB TTL index automatically removes expired documents
      // But we can also manually clean up sessions older than TTL
      const now = new Date();

      const result = await sessionsCollection.deleteMany({
        expires: { $lt: now }
      });

      if (result.deletedCount > 0) {
        console.log(`✓ Cleaned up ${result.deletedCount} expired session(s)`);
      }

      // Get count of active sessions
      const activeCount = await sessionsCollection.countDocuments({
        expires: { $gte: now }
      });

      console.log(`ℹ Active sessions: ${activeCount}`);

      return {
        deletedCount: result.deletedCount,
        activeCount: activeCount
      };
    } catch (error) {
      console.error('✗ Error cleaning up sessions:', error.message);
      return {
        deletedCount: 0,
        activeCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get statistics about current sessions
   */
  async getSessionStats() {
    try {
      const db = getMongoDb();
      const sessionsCollection = db.collection('sessions');
      const now = new Date();

      const totalSessions = await sessionsCollection.countDocuments({});
      const activeSessions = await sessionsCollection.countDocuments({
        expires: { $gte: now }
      });
      const expiredSessions = totalSessions - activeSessions;

      // Get sessions by user type if session data contains user info
      const sessionsByType = await sessionsCollection.aggregate([
        {
          $match: {
            expires: { $gte: now }
          }
        },
        {
          $group: {
            _id: '$session.user.user_type',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      return {
        total: totalSessions,
        active: activeSessions,
        expired: expiredSessions,
        byType: sessionsByType
      };
    } catch (error) {
      console.error('✗ Error getting session stats:', error.message);
      return null;
    }
  }

  /**
   * Remove all sessions for a specific user
   */
  async removeUserSessions(userId) {
    try {
      const db = getMongoDb();
      const sessionsCollection = db.collection('sessions');

      const result = await sessionsCollection.deleteMany({
        'session.user.id': userId
      });

      console.log(`✓ Removed ${result.deletedCount} session(s) for user ${userId}`);
      return result.deletedCount;
    } catch (error) {
      console.error(`✗ Error removing sessions for user ${userId}:`, error.message);
      return 0;
    }
  }
}

// Export singleton instance
const sessionCleanupService = new SessionCleanupService();

module.exports = sessionCleanupService;
