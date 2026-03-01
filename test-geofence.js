const http = require('http');

function post(path, data, cookie) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'localhost', port: 5001, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    if (cookie) opts.headers.Cookie = cookie;
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  const login = await post('/api/auth/login', { email: 'sita@democompany.com', password: 'SuperAdmin@123' });
  if (login.status !== 200) { console.log('Login failed:', login.body); return; }
  const cookie = login.headers['set-cookie']?.[0]?.split(';')[0];
  console.log('Logged in as Sita');

  console.log('\n--- Test 1: Outside geofence (Kathmandu, ~89km away) ---');
  const far = await post('/api/attendance/scan', { qrPayload: 'test', latitude: 27.7172, longitude: 85.3240 }, cookie);
  console.log('Status:', far.status);
  console.log('Response:', JSON.stringify(far.body));

  console.log('\n--- Test 2: Inside geofence (50m from office) ---');
  const near = await post('/api/attendance/scan', { qrPayload: 'test', latitude: 27.0201, longitude: 84.8801 }, cookie);
  console.log('Status:', near.status);
  console.log('Response:', JSON.stringify(near.body));
}

test();
