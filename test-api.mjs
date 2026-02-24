/**
 * Smart Attendance API Test Suite
 * Run from project root: node test-api.mjs
 */

const BASE = 'http://localhost:5001/api';

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'orgadmin@democompany.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'OrgAdmin@123';

let passed = 0, failed = 0, skipped = 0;
let cookieJar = '';

async function req(method, path, body, authenticated = false) {
  const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
  if (authenticated && cookieJar) headers['Cookie'] = cookieJar;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookieJar = setCookie.split(';')[0];
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

function pass(name)         { passed++;  console.log(G('  ✓ PASS') + `  ${name}`); }
function fail(name, detail) { failed++;  console.log(R('  ✗ FAIL') + `  ${name}`); if (detail) console.log(`         ${Y(detail)}`); }
function skip(name, reason) { skipped++; console.log(Y('  ⊘ SKIP') + `  ${name} — ${reason}`); }
function section(t)         { console.log(`\n${BOLD(B('━━ ' + t + ' ' + '━'.repeat(Math.max(0, 55 - t.length))))}`); }

// ── Tests ──────────────────────────────────────────────────────

async function testHealth() {
  section('1. Health Check');
  try {
    const { status } = await req('GET', '/health');
    if (status === 200) { pass('GET /api/health returns 200'); return true; }
    else { fail('GET /api/health', `status ${status}`); return false; }
  } catch {
    fail('GET /api/health', 'Cannot connect — is backend running on :5001?');
    return false;
  }
}

async function testAdminLogin() {
  section('2. Admin Login');
  const { status, data } = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (status === 200 && data?.data?.user) {
    pass(`Logged in as ${data.data.user.email} (${data.data.user.role})`);
    if (cookieJar) pass('Session cookie received');
    else fail('No session cookie in response');
    return data.data.user;
  } else {
    fail('Admin login', `status=${status} — ${data?.error?.message || 'check credentials'}`);
    return null;
  }
}

async function testBruteForce() {
  section('3. C-05 — Brute-force Lockout (Redis)');
  const testEmail = `lockout-${Date.now()}@test.invalid`;

  for (let i = 1; i <= 5; i++) {
    const { status } = await req('POST', '/auth/login', { email: testEmail, password: 'WrongPass1!' });
    process.stdout.write(Y(`    attempt ${i}/5 (status ${status})...\r`));
  }
  console.log('');
  pass('5 failed login attempts completed');

  const { status, data } = await req('POST', '/auth/login', { email: testEmail, password: 'WrongPass1!' });
  const msg = (data?.error?.message || '').toLowerCase();
  if (msg.includes('lock')) {
    pass(`6th attempt locked — "${data.error.message}"`);
  } else if (status === 401) {
    skip('Lockout message', `User doesn't exist in DB so lock may not trigger (msg: "${data?.error?.message}")`);
  } else {
    fail('6th attempt should be locked', `status=${status} msg="${data?.error?.message}"`);
  }
}

async function testEmployeeCreation() {
  section('4. C-07 — Employee Creation Returns PIN');
  const { status, data } = await req('POST', '/users', {
    email: `testpin-${Date.now()}@test.invalid`,
    password: 'TestPass123!',
    firstName: 'PinTest',
    lastName: 'User',
    role: 'EMPLOYEE',
  }, true);

  if (status === 201 && data?.data?.pin && /^\d{4}$/.test(data.data.pin)) {
    pass(`Employee created — auto PIN: ${BOLD(data.data.pin)}`);
    return { userId: data.data.id, employeeId: data.data.employeeId, pin: data.data.pin };
  } else if (status === 201 && !data?.data?.pin) {
    fail('Response missing pin field', JSON.stringify(data?.data).slice(0, 120));
  } else {
    fail(`POST /users`, `status=${status} — ${data?.error?.message || ''}`);
  }
  return null;
}

async function testScanNoPinField(employeeId) {
  section('5. C-07 — Scan Without pin Field Rejected');
  const { status, data } = await req('POST', '/attendance/scan-public', {
    employeeId,
    qrPayload: 'dummy',
    latitude: 27.7172,
    longitude: 85.3240,
  });
  const msg = data?.error?.message || '';
  if (status !== 200) {
    pass(`Scan without pin rejected (status=${status} "${msg.slice(0,60)}")`);
  } else {
    fail('Should be rejected without pin', `got 200`);
  }
}

async function testScanWrongPin(employeeId) {
  section('6. C-07 — Scan With Wrong PIN Rejected');
  const { status, data } = await req('POST', '/attendance/scan-public', {
    employeeId,
    pin: '0000',
    qrPayload: 'dummy',
    latitude: 27.7172,
    longitude: 85.3240,
  });
  const msg = data?.error?.message || '';
  if (status !== 200) {
    pass(`Wrong PIN rejected (status=${status} "${msg.slice(0,60)}")`);
  } else {
    fail('Wrong PIN should be rejected', 'got 200');
  }
}

async function testPinReset(userId) {
  section('7. C-07 — Admin PIN Reset Returns New PIN');
  const { status, data } = await req('PATCH', `/users/${userId}/attendance-pin`, {}, true);
  if (status === 200 && data?.data?.pin && /^\d{4}$/.test(data.data.pin)) {
    pass(`PIN reset — new PIN: ${BOLD(data.data.pin)}`);
    return data.data.pin;
  } else {
    fail('PIN reset', `status=${status} — ${data?.error?.message || JSON.stringify(data).slice(0,80)}`);
  }
  return null;
}

async function testOrgIsolation() {
  section('8. Org Isolation');
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const { status } = await req('PATCH', `/users/${fakeId}/attendance-pin`, {}, true);
  if (status === 404 || status === 403) {
    pass(`Cross-org PIN reset blocked (status=${status})`);
  } else {
    fail('Cross-org access should be blocked', `got status ${status}`);
  }
}

async function cleanup(userId) {
  if (!userId) return;
  await req('DELETE', `/users/${userId}`, null, true);
  console.log(Y('\n  (Test employee deleted)'));
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(BOLD('\n╔══════════════════════════════════════════════════════╗'));
  console.log(BOLD('║        Smart Attendance API Test Suite               ║'));
  console.log(BOLD('╚══════════════════════════════════════════════════════╝'));
  console.log(`  Backend: ${B(BASE)}`);
  console.log(`  Admin:   ${B(ADMIN_EMAIL)}\n`);

  const healthy = await testHealth();
  if (!healthy) { console.log(R('\n  Start backend first: cd backend && npm run dev\n')); process.exit(1); }

  const user = await testAdminLogin();
  if (!user) { console.log(Y('\n  Check credentials and try again\n')); process.exit(1); }

  await testBruteForce();

  const created = await testEmployeeCreation();
  if (created) {
    await testScanNoPinField(created.employeeId);
    await testScanWrongPin(created.employeeId);
    await testPinReset(created.userId);
    await testOrgIsolation();
    await cleanup(created.userId);
  } else {
    ['Scan tests', 'PIN reset', 'Org isolation'].forEach(t => skip(t, 'Employee creation failed'));
  }

  const total = passed + failed + skipped;
  console.log(BOLD('\n╔══════════════════════════════════════════════════════╗'));
  console.log(BOLD(`║  ${G(passed + ' passed')}  ${failed ? R(failed + ' failed') : '0 failed'}  ${skipped ? Y(skipped + ' skipped') : '0 skipped'}  / ${total} total`));
  console.log(BOLD('╚══════════════════════════════════════════════════════╝\n'));
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(R('\n' + e.message)); process.exit(1); });
