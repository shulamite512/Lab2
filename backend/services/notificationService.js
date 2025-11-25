// services/notificationService.js
// Simple in-memory SSE broadcaster keyed by user id
const clients = new Map(); // userId (string) -> Set of response objects

function register(userId, res) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
  console.log(`[SSE] Client registered for user ${key}, total clients: ${clients.get(key).size}`);
  console.log('[SSE] Currently registered users:', Array.from(clients.keys()));

  // Remove on close
  reqOnClose(res, () => {
    const set = clients.get(key);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(key);
      console.log(`[SSE] Client removed for user ${key}, remaining clients: ${set.size}`);
    }
  });
}

function reqOnClose(res, cb) {
  // res is an http.ServerResponse
  res.on('close', cb);
  res.on('finish', cb);
}

function sendNotification(userId, event, data) {
  const key = String(userId);
  const set = clients.get(key);
  if (!set) {
    console.log(`[SSE] No clients for user ${key}`);
    return false;
  }
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  console.log(`[SSE] Attempting to send ${event} to user ${key}, ${set.size} clients connected`);
  let deliveredCount = 0;
  for (const res of Array.from(set)) {
    try {
      res.write(payload);
      deliveredCount++;
    } catch (e) {
      console.log(`[SSE] Failed to write to client for user ${key}:`, e.message || e);
      set.delete(res);
    }
  }
  console.log(`[SSE] Notification delivered to ${deliveredCount}/${set.size} clients for user ${key}`);
  return deliveredCount > 0;
}

// Periodic ping to keep connections alive
setInterval(() => {
  for (const [userId, set] of clients.entries()) {
    for (const res of Array.from(set)) {
      try { res.write(': ping\n\n'); } catch (e) { set.delete(res); }
    }
  }
}, 20000);

module.exports = {
  register,
  sendNotification,
  // debug helper to inspect connected clients for a user
  getClientCount: (userId) => {
    const key = String(userId);
    const set = clients.get(key);
    return set ? set.size : 0;
  }
};
