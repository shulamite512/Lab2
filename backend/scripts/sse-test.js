
const http = require('http');

const HOST = 'localhost';
const PORT = 3001;

function request(method, path, body = null, cookies = []) {
  const headers = {
    'Accept': 'application/json'
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  if (cookies && cookies.length) {
    headers['Cookie'] = cookies.join('; ');
  }

  const opts = { host: HOST, port: PORT, path, method, headers };

  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function openSSE(cookie) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    };
    if (cookie) headers['Cookie'] = cookie;

    const opts = { host: HOST, port: PORT, path: '/api/owner/notifications/stream', method: 'GET', headers };

    const req = http.request(opts, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('SSE connection failed with status ' + res.statusCode));
        return;
      }

      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        // SSE sends events as lines; look for double-newline indicating end of event
        while (buffer.indexOf('\n\n') !== -1) {
          const idx = buffer.indexOf('\n\n');
          const block = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!block) continue;
          const lines = block.split(/\r?\n/);
          const event = { event: null, data: '' };
          for (const line of lines) {
            if (line.startsWith('event:')) event.event = line.replace(/^event:\s*/, '').trim();
            else if (line.startsWith('data:')) event.data += line.replace(/^data:\s*/, '') + '\n';
          }
          if (event.data) event.data = event.data.trim();
          // Ignore comments/ping blocks (lines starting with ':' produce empty event/data)
          if (!event.event && (!event.data || event.data === '')) {
            // continue waiting for a real event
            continue;
          }
          resolve({ raw: block, event });
          // once received, close the request
          req.abort();
          return;
        }
      });

      res.on('end', () => {
        reject(new Error('SSE stream ended before event arrived'));
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  try {
    console.log('Fetching properties to ensure there is at least one...');
    const propsResp = await request('GET', '/api/properties');
    const props = JSON.parse(propsResp.body).properties || [];
    if (props.length === 0) {
      console.error('No properties available at /api/properties. Please create one first.');
      process.exit(1);
    }
    const propId = props[0].id;
    console.log('Using property id', propId);

    // Owner signup/login
    const ts = Date.now();
    const ownerEmail = `owner${ts}@test.local`;
    const travEmail = `trav${ts}@test.local`;

    await request('POST', '/api/auth/signup', { name: 'Owner SSE', email: ownerEmail, password: 'pass123', user_type: 'owner' }).catch(() => {});
    const ownerLogin = await request('POST', '/api/auth/login', { email: ownerEmail, password: 'pass123' });
    const ownerCookies = (ownerLogin.headers['set-cookie'] || []).map((c) => c.split(';')[0]);
    console.log('Owner logged in, cookies:', ownerCookies);

  // Open SSE connection as owner (non-blocking, but we'll await event via Promise)
  const cookieHeader = ownerCookies.join('; ');
  console.log('Opening SSE connection as owner...');
  const ssePromise = openSSE(cookieHeader);
    // Give the server a short moment to register the SSE client before creating the booking
    await new Promise((r) => setTimeout(r, 800));

    // Check debug endpoint to confirm the server registered our SSE client
    try {
      const dbg = await request('GET', '/api/owner/notifications/debug', null, ownerCookies);
      console.log('Notifications debug response:', dbg.statusCode, dbg.body);
      try { console.log('Parsed debug:', JSON.parse(dbg.body)); } catch(e) {}
    } catch (e) {
      console.warn('Failed to call notifications debug endpoint:', e.message || e);
    }

    // Create traveler and login
    await request('POST', '/api/auth/signup', { name: 'Traveler SSE', email: travEmail, password: 'pass123', user_type: 'traveler' }).catch(() => {});
    const travLogin = await request('POST', '/api/auth/login', { email: travEmail, password: 'pass123' });
    const travCookies = (travLogin.headers['set-cookie'] || []).map((c) => c.split(';')[0]);
    console.log('Traveler logged in, cookies:', travCookies);

    // Create booking as traveler
    const start = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0,10);
    const end = new Date(Date.now() + 33 * 24 * 3600 * 1000).toISOString().slice(0,10);
    console.log('Creating booking', { property_id: propId, start_date: start, end_date: end });
    const bookingResp = await request('POST', '/api/bookings', { property_id: propId, start_date: start, end_date: end, number_of_guests: 1 }, travCookies);
    console.log('Booking creation response status', bookingResp.statusCode, bookingResp.body);

    // Wait for SSE event (timeout 10s)
    const event = await Promise.race([
      ssePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout waiting for SSE event')), 10000))
    ]);

    console.log('SSE event received:', event);
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
