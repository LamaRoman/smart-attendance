/**
 * SEED — Realistic attendance data for accountant testing
 * Creates AUTO_CLOSED, CHECKED_OUT, late arrivals, and manual records
 * across recent dates so the accountant can test edit/acknowledge features.
 *
 * AUTO_CLOSED records have check-out at exactly the org's workEndTime (18:00)
 * matching the actual system behavior in performClockActionSafe.
 *
 * Prerequisites: Run seed2.ts first (TestCo org with 18 employees)
 * Run: npx ts-node prisma/seed-attendance-test.ts
 * Safe to re-run — checks for existing records per employee per day
 */
import 'dotenv/config';
import { PrismaClient, CheckInMethod, AttendanceRecordStatus } from '@prisma/client';

const prisma = new PrismaClient();

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeDate(dateStr: string, hour: number, minute: number, second: number = 0): Date {
  const d = new Date(dateStr);
  d.setHours(hour, minute, second, 0);
  return d;
}

function durationMinutes(checkIn: Date, checkOut: Date): number {
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
}

// Simple AD to BS approximation for seeding
function approxAdToBS(date: Date): { year: number; month: number; day: number } {
  const adYear = date.getFullYear();
  const adMonth = date.getMonth() + 1;
  if (adMonth >= 4) {
    return { year: adYear + 57, month: adMonth - 3, day: date.getDate() };
  } else {
    return { year: adYear + 56, month: adMonth + 9, day: date.getDate() };
  }
}

// Generate recent work dates (skip Saturdays — Nepal weekend)
function getRecentWorkDates(count: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  let d = new Date(today);

  while (dates.length < count) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates.reverse();
}

async function main() {
  const TEST_SLUG = 'testco-nepal-seed';

  // ── Find org and get workEndTime ──────────────────────────────────────────
  const org = await prisma.organization.findUnique({ where: { slug: TEST_SLUG } });
  if (!org) {
    console.error('❌ TestCo org not found. Run seed2.ts first.');
    process.exit(1);
  }

  const workEndTime = org.workEndTime; // e.g. "18:00"
  const [endHour, endMinute] = workEndTime.split(':').map(Number);
  console.log(`✓ Found org: ${org.name}`);
  console.log(`✓ Org workEndTime: ${workEndTime}`);

  const memberships = await prisma.orgMembership.findMany({
    where: { organizationId: org.id, role: 'EMPLOYEE', isActive: true },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { employeeId: 'asc' },
  });

  if (memberships.length === 0) {
    console.error('❌ No employees found.');
    process.exit(1);
  }
  console.log(`✓ Found ${memberships.length} employees`);

  // Get admin membership for modifiedBy on manual entries
  const adminMembership = await prisma.orgMembership.findFirst({
    where: { organizationId: org.id, role: 'ORG_ADMIN' },
  });

  const dates = getRecentWorkDates(7);
  console.log(`✓ Dates: ${dates[0]} to ${dates[dates.length - 1]}\n`);

  let created = 0;
  let skipped = 0;
  let autoClosedTotal = 0;
  let checkedOutTotal = 0;
  let manualTotal = 0;

  for (const dateStr of dates) {
    let dateCreated = 0;
    let dateAutoClosedCount = 0;
    const dateIndex = dates.indexOf(dateStr);

    for (let i = 0; i < memberships.length; i++) {
      const mem = memberships[i];

      // Check for existing record on this day
      const dayStart = new Date(dateStr);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr);
      dayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.attendanceRecord.findFirst({
        where: {
          membershipId: mem.id,
          checkInTime: { gte: dayStart, lte: dayEnd },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const bs = approxAdToBS(new Date(dateStr));

      // ── Decide what type of record to create ──────────────────────────────

      // AUTO_CLOSED: every 3rd employee on even-indexed dates
      if (i % 3 === 0 && dateIndex % 2 === 0) {
        // Check-in varies (some early, some late, some on time)
        const checkInVariants = [
          { hour: 9, minute: 5 },   // on time
          { hour: 8, minute: 30 },  // early
          { hour: 10, minute: 45 }, // late
        ];
        const variant = checkInVariants[i % 3];
        const checkIn = makeDate(dateStr, variant.hour, variant.minute);

        // Check-out is EXACTLY at org workEndTime — this is what the system does
        const checkOut = makeDate(dateStr, endHour, endMinute, 0);
        const duration = durationMinutes(checkIn, checkOut);

        // Some already reviewed by accountant (every 6th employee) to test locked state
        const alreadyReviewed = i % 6 === 0;

        await prisma.attendanceRecord.create({
          data: {
            membershipId: mem.id,
            organizationId: org.id,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            checkInMethod: 'QR_SCAN',
            checkOutMethod: 'MANUAL',
            duration,
            status: 'AUTO_CLOSED',
            isActive: true,
            isManualEntry: false,
            notes: `Auto-closed: employee did not clock out. Check-out capped at shift end (${workEndTime}).`,
            bsYear: bs.year,
            bsMonth: bs.month,
            bsDay: bs.day,
            reviewedByAccountant: alreadyReviewed,
            reviewedAt: alreadyReviewed ? new Date() : null,
          },
        });

        dateAutoClosedCount++;
        autoClosedTotal++;
        dateCreated++;

      // MANUAL entry: every 7th employee on odd-indexed dates
      } else if (i % 7 === 0 && dateIndex % 2 === 1) {
        const checkIn = makeDate(dateStr, 10, 0);
        const checkOut = makeDate(dateStr, 17, 30);
        const duration = durationMinutes(checkIn, checkOut);

        await prisma.attendanceRecord.create({
          data: {
            membershipId: mem.id,
            organizationId: org.id,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            checkInMethod: 'MANUAL',
            checkOutMethod: 'MANUAL',
            duration,
            status: 'CHECKED_OUT',
            isActive: true,
            isManualEntry: true,
            modifiedBy: adminMembership?.userId || null,
            modifiedAt: new Date(),
            modificationNote: 'Employee forgot QR card',
            notes: 'Manual clock in by admin. Employee forgot QR card.',
            bsYear: bs.year,
            bsMonth: bs.month,
            bsDay: bs.day,
          },
        });

        manualTotal++;
        dateCreated++;

      // Normal CHECKED_OUT: everyone else
      } else {
        // Vary check-in times for realism
        const checkInOptions = [
          { hour: 9, minute: rnd(50, 59) },   // on time
          { hour: 9, minute: rnd(0, 10) },    // early
          { hour: 10, minute: rnd(15, 30) },  // late (past threshold)
          { hour: 9, minute: rnd(55, 59) },   // just on time
        ];
        const ci = checkInOptions[i % 4];
        const checkIn = makeDate(dateStr, ci.hour, ci.minute);

        // Check-out varies
        const checkOutOptions = [
          { hour: 18, minute: rnd(0, 15) },   // normal
          { hour: 19, minute: rnd(0, 30) },   // overtime
          { hour: 16, minute: rnd(0, 30) },   // early departure
          { hour: 18, minute: rnd(5, 20) },   // slightly late
        ];
        const co = checkOutOptions[i % 4];
        const checkOut = makeDate(dateStr, co.hour, co.minute);
        const duration = durationMinutes(checkIn, checkOut);

        await prisma.attendanceRecord.create({
          data: {
            membershipId: mem.id,
            organizationId: org.id,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            checkInMethod: 'QR_SCAN',
            checkOutMethod: 'QR_SCAN',
            duration,
            status: 'CHECKED_OUT',
            isActive: true,
            isManualEntry: false,
            bsYear: bs.year,
            bsMonth: bs.month,
            bsDay: bs.day,
          },
        });

        checkedOutTotal++;
        dateCreated++;
      }

      created++;
    }

    const dateLabel = new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    console.log(`  ✓ ${dateLabel} — ${dateCreated} new records (${dateAutoClosedCount} auto-closed)`);
  }

  // ── Verification: confirm all AUTO_CLOSED checkouts are at exact workEndTime ──
  const allAutoClosed = await prisma.attendanceRecord.findMany({
    where: { organizationId: org.id, status: 'AUTO_CLOSED' },
    select: { id: true, checkOutTime: true },
  });

  let verifyPass = true;
  for (const rec of allAutoClosed) {
    if (rec.checkOutTime) {
      const h = rec.checkOutTime.getHours();
      const m = rec.checkOutTime.getMinutes();
      const s = rec.checkOutTime.getSeconds();
      const ms = rec.checkOutTime.getMilliseconds();
      if (h !== endHour || m !== endMinute || s !== 0 || ms !== 0) {
        console.log(`  ❌ VERIFY FAIL: Record ${rec.id} checkout=${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms} — expected ${workEndTime}:00.000`);
        verifyPass = false;
      }
    }
  }

  if (verifyPass) {
    console.log(`\n  ✅ VERIFIED: All ${allAutoClosed.length} AUTO_CLOSED records have checkout at exactly ${workEndTime}:00`);
  } else {
    console.log(`\n  ⚠ VERIFICATION FAILED: Some AUTO_CLOSED records have incorrect checkout times`);
  }

  // Final stats
  const totalAutoClosed = await prisma.attendanceRecord.count({
    where: { organizationId: org.id, status: 'AUTO_CLOSED' },
  });
  const totalUnreviewed = await prisma.attendanceRecord.count({
    where: { organizationId: org.id, status: 'AUTO_CLOSED', reviewedByAccountant: false },
  });
  const totalReviewed = await prisma.attendanceRecord.count({
    where: { organizationId: org.id, status: 'AUTO_CLOSED', reviewedByAccountant: true },
  });

  console.log(`
╔══════════════════════════════════════════════════════╗
║     ATTENDANCE TEST DATA SEEDED ✅                   ║
╠══════════════════════════════════════════════════════╣
║  Records created:    ${String(created).padEnd(32)}║
║  Skipped (existing): ${String(skipped).padEnd(32)}║
║                                                      ║
║  Breakdown:                                          ║
║    AUTO_CLOSED:    ${String(autoClosedTotal).padEnd(34)}║
║    CHECKED_OUT:    ${String(checkedOutTotal).padEnd(34)}║
║    Manual entries: ${String(manualTotal).padEnd(34)}║
║                                                      ║
║  AUTO_CLOSED review status:                          ║
║    Unreviewed:       ${String(totalUnreviewed).padEnd(32)}║
║    Already reviewed: ${String(totalReviewed).padEnd(32)}║
║                                                      ║
║  Login: accountant@testco.np / Accountant@1234       ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
