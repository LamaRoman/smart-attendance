// src/scripts/seed-load-test.ts
// ============================================================
// Load test seed — industry-standard bulk insert approach
//
// Creates:
//   - 200 organizations
//   - 500 org admins (2-3 per org)
//   - 10,000 employees spread across orgs
//   - OrgSubscription (ACTIVE, Operations) per org
//   - 30 days of attendance records per employee:
//       ~80% attendance rate
//       ~65% on time, ~25% late, ~10% very late
//       Realistic check-in/out times based on org shift
//
// Strategy: createMany in batches of 500 to avoid
// overwhelming the DB connection pool.
// ============================================================

import { PrismaClient, Role, CheckInMethod, AttendanceRecordStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────
const ORG_COUNT       = 500;
const TOTAL_EMPLOYEES = 50_000;
const TOTAL_ADMINS    = 1_000;
const DAYS_OF_HISTORY = 30;
const BATCH_SIZE      = 500;

// Pre-hash once — reused for all test users (Test@123)
const TEST_PASSWORD_HASH = bcrypt.hashSync('Test@123', 8);

// ── Helpers ──────────────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getWorkingDaysInPast(daysBack: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay(); // 0=Sun
    if (dow !== 0) dates.push(d); // skip Sundays only for simplicity
  }
  return dates;
}

async function batchInsert<T>(
  label: string,
  items: T[],
  insertFn: (batch: T[]) => Promise<any>
): Promise<void> {
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await insertFn(batch);
    inserted += batch.length;
    process.stdout.write(`\r  ${label}: ${inserted}/${items.length}`);
  }
  console.log(` ✓`);
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Load test seed starting...\n');
  console.log(`   Orgs: ${ORG_COUNT} | Admins: ${TOTAL_ADMINS} | Employees: ${TOTAL_EMPLOYEES}`);
  console.log(`   Attendance: ${DAYS_OF_HISTORY} days history\n`);

  // ── 0. Get plans ───────────────────────────────────────────
  const opsPlan = await prisma.pricingPlan.findFirst({
    where: { tier: 'OPERATIONS', isActive: true },
  });
  const starterPlan = await prisma.pricingPlan.findFirst({
    where: { tier: 'STARTER', isActive: true },
  });
  if (!opsPlan || !starterPlan) {
    throw new Error('Plans not found — run the main seed first: npx ts-node prisma/seed.ts');
  }

  // ── 1. Organizations ───────────────────────────────────────
  console.log('1. Creating organizations...');
  const orgData = Array.from({ length: ORG_COUNT }, (_, i) => ({
    id:           randomUUID(),
    name:         `Load Test Org ${String(i + 1).padStart(3, '0')}`,
    email:        `org${i + 1}@loadtest.dev`,
    phone:        `98${String(randomInt(10000000, 99999999))}`,
    address:      `${randomElement(['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar'])}, Nepal`,
    isActive:     true,
    calendarMode: 'NEPALI' as const,
    language:     'NEPALI' as const,
    workStartTime:        randomElement(['09:00', '09:30', '10:00', '10:30']),
    workEndTime:          '18:00',
    lateThresholdMinutes: randomElement([10, 15, 20]),
    workingDays:          '1,2,3,4,5,6', // Mon–Sat
  }));

  await batchInsert('Organizations', orgData, (batch) =>
    prisma.organization.createMany({ data: batch, skipDuplicates: true })
  );

  // ── 2. Users (admins + employees) ─────────────────────────
  console.log('2. Creating users...');

  // Distribute admins: 2-3 per org up to TOTAL_ADMINS
  const adminData: any[] = [];
  const employeeData: any[] = [];

  let adminCounter = 0;
  let empCounter   = 0;

  const employeesPerOrg = Math.floor(TOTAL_EMPLOYEES / ORG_COUNT); // ~50 per org
  const extraEmployees  = TOTAL_EMPLOYEES % ORG_COUNT;

  for (let i = 0; i < ORG_COUNT; i++) {
    const org = orgData[i];

    // Admins — 2 per org for first 250, 3 for next 166, 1 for rest (totals ~500)
    const adminCount = adminCounter < 250 ? 2 : adminCounter < 416 ? 3 : 1;
    for (let a = 0; a < adminCount && adminData.length < TOTAL_ADMINS; a++) {
      adminData.push({
        id:             randomUUID(),
        email:          `admin${++adminCounter}@loadtest.dev`,
        password:       TEST_PASSWORD_HASH,
        firstName:      `Admin`,
        lastName:       `${adminCounter}`,
        role:           Role.ORG_ADMIN,
        isActive:       true,
        organizationId: org.id,
      });
    }

    // Employees
    const count = i < extraEmployees ? employeesPerOrg + 1 : employeesPerOrg;
    for (let e = 0; e < count; e++) {
      ++empCounter;
      employeeData.push({
        id:             randomUUID(),
        email:          `emp${empCounter}@loadtest.dev`,
        password:       TEST_PASSWORD_HASH,
        firstName:      `Employee`,
        lastName:       `${empCounter}`,
        employeeId:     `LT${String(empCounter).padStart(5, '0')}`,
        role:           Role.EMPLOYEE,
        isActive:       true,
        organizationId: org.id,
      });
    }
  }

  await batchInsert('Admins', adminData, (batch) =>
    prisma.user.createMany({ data: batch, skipDuplicates: true })
  );
  await batchInsert('Employees', employeeData, (batch) =>
    prisma.user.createMany({ data: batch, skipDuplicates: true })
  );

  // ── 3. Subscriptions ───────────────────────────────────────
  console.log('3. Creating subscriptions...');
  const now = new Date();
  const subData = orgData.map((org, i) => ({
    id:             randomUUID(),
    organizationId: org.id,
    // 60% Operations, 40% Starter
    planId:         i % 10 < 6 ? opsPlan.id : starterPlan.id,
    status:         'ACTIVE' as const,
    billingCycle:   'MONTHLY' as const,
    isTrialUsed:    true,
    assignedAt:     now,
    currentPeriodStart: now,
    currentEmployeeCount: Math.floor(TOTAL_EMPLOYEES / ORG_COUNT),
  }));

  await batchInsert('Subscriptions', subData, (batch) =>
    prisma.orgSubscription.createMany({ data: batch, skipDuplicates: true })
  );

  // ── 4. Attendance records ──────────────────────────────────
  console.log('4. Creating attendance records (this takes the longest)...');

  const workingDays = getWorkingDaysInPast(DAYS_OF_HISTORY);

  // Build org shift map
  const orgShiftMap: Record<string, { startH: number; startM: number }> = {};
  for (const org of orgData) {
    const [h, m] = org.workStartTime.split(':').map(Number);
    orgShiftMap[org.id] = { startH: h, startM: m };
  }

  // Build employee → org map
  const empOrgMap: Record<string, string> = {};
  for (const emp of employeeData) {
    empOrgMap[emp.id] = emp.organizationId;
  }

  let attendanceBatch: any[] = [];
  let totalAttendance = 0;

  const flushAttendance = async () => {
    if (attendanceBatch.length === 0) return;
    await prisma.attendanceRecord.createMany({ data: attendanceBatch, skipDuplicates: true });
    totalAttendance += attendanceBatch.length;
    process.stdout.write(`\r  Attendance records: ${totalAttendance}`);
    attendanceBatch = [];
  };

  for (const emp of employeeData) {
    const orgId = empOrgMap[emp.id];
    const shift = orgShiftMap[orgId];

    for (const day of workingDays) {
      // ~80% attendance rate
      if (Math.random() > 0.80) continue;

      // Determine lateness
      const rand = Math.random();
      let lateMinutes: number;
      if (rand < 0.65) {
        lateMinutes = randomInt(-5, 10);   // on time or slightly early/late
      } else if (rand < 0.90) {
        lateMinutes = randomInt(11, 45);   // late
      } else {
        lateMinutes = randomInt(46, 120);  // very late
      }

      // Check-in time
      const checkIn = new Date(day);
      checkIn.setHours(shift.startH, shift.startM + lateMinutes, randomInt(0, 59), 0);

      // Work duration 7–9.5 hours
      const workMinutes = randomInt(420, 570);
      const checkOut = addMinutes(checkIn, workMinutes);

      attendanceBatch.push({
        id:            randomUUID(),
        userId:        emp.id,
        organizationId: orgId,
        checkInTime:   checkIn,
        checkOutTime:  checkOut,
        checkInMethod:  CheckInMethod.QR_SCAN,
        checkOutMethod: CheckInMethod.QR_SCAN,
        duration:      workMinutes,
        status:        AttendanceRecordStatus.CHECKED_OUT,
        isActive:      true,
        isManualEntry: false,
      });

      if (attendanceBatch.length >= BATCH_SIZE) {
        await flushAttendance();
      }
    }
  }

  await flushAttendance();
  console.log(` ✓`);

  // ── 5. Summary ─────────────────────────────────────────────
  const [orgCount, userCount, subCount, attCount] = await Promise.all([
    prisma.organization.count({ where: { email: { endsWith: '@loadtest.dev' } } }),
    prisma.user.count({ where: { email: { endsWith: '@loadtest.dev' } } }),
    prisma.orgSubscription.count(),
    prisma.attendanceRecord.count(),
  ]);

  console.log('\n✅ Load test seed complete\n');
  console.log(`   Organizations:      ${orgCount}`);
  console.log(`   Users (all):        ${userCount}`);
  console.log(`   Subscriptions:      ${subCount}`);
  console.log(`   Attendance records: ${attCount}`);
  console.log(`\n   Login: emp1@loadtest.dev / Test@123 (any org admin: admin1@loadtest.dev)`);
}

main()
  .catch((e) => { console.error('\n❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
