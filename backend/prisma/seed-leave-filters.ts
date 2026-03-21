/**
 * SUPPLEMENTAL SEED — Adds subscription + rich leave data to TestCo org
 * for testing the accountant's leave filter feature.
 *
 * Prerequisites: Run the main seed.ts first (TestCo Nepal Pvt. Ltd.)
 * Run: npx ts-node prisma/seed-leave-filters.ts
 * Safe to re-run — skips existing records
 */
import 'dotenv/config';
import { PrismaClient, LeaveType, LeaveStatus } from '@prisma/client';

const prisma = new PrismaClient();

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// BS month 1 start dates (approximate AD equivalents)
const BS_START: Record<number, Record<number, Date>> = {
  2081: {
    1:  new Date('2024-04-13'), 2:  new Date('2024-05-14'),
    3:  new Date('2024-06-15'), 4:  new Date('2024-07-16'),
    5:  new Date('2024-08-17'), 6:  new Date('2024-09-17'),
    7:  new Date('2024-10-18'), 8:  new Date('2024-11-17'),
    9:  new Date('2024-12-16'), 10: new Date('2025-01-15'),
    11: new Date('2025-02-13'), 12: new Date('2025-03-14'),
  },
  2082: {
    1:  new Date('2025-04-14'), 2:  new Date('2025-05-15'),
    3:  new Date('2025-06-15'), 4:  new Date('2025-07-16'),
    5:  new Date('2025-08-17'), 6:  new Date('2025-09-17'),
    7:  new Date('2025-10-17'), 8:  new Date('2025-11-16'),
    9:  new Date('2025-12-16'), 10: new Date('2026-01-14'),
    11: new Date('2026-02-13'), 12: new Date('2026-03-14'),
  },
};

// Leave scenarios designed to test every filter combination
const LEAVE_SCENARIOS: Array<{
  type: LeaveType;
  status: LeaveStatus;
  bsYear: number;
  bsMonth: number;
  dayOffset: number;
  duration: number;
  reason: string;
}> = [
  // ── SICK leaves across months and statuses ─────────────────
  { type: 'SICK', status: 'APPROVED', bsYear: 2082, bsMonth: 1, dayOffset: 3, duration: 2, reason: 'Fever and headache' },
  { type: 'SICK', status: 'APPROVED', bsYear: 2082, bsMonth: 4, dayOffset: 10, duration: 1, reason: 'Food poisoning' },
  { type: 'SICK', status: 'PENDING', bsYear: 2082, bsMonth: 11, dayOffset: 5, duration: 3, reason: 'Viral infection' },
  { type: 'SICK', status: 'REJECTED', bsYear: 2081, bsMonth: 8, dayOffset: 7, duration: 1, reason: 'Feeling unwell' },

  // ── CASUAL leaves ──────────────────────────────────────────
  { type: 'CASUAL', status: 'APPROVED', bsYear: 2082, bsMonth: 2, dayOffset: 5, duration: 1, reason: 'Personal work' },
  { type: 'CASUAL', status: 'APPROVED', bsYear: 2082, bsMonth: 7, dayOffset: 12, duration: 2, reason: 'Family event' },
  { type: 'CASUAL', status: 'PENDING', bsYear: 2082, bsMonth: 10, dayOffset: 8, duration: 1, reason: 'Bank visit' },

  // ── ANNUAL leaves ──────────────────────────────────────────
  { type: 'ANNUAL', status: 'APPROVED', bsYear: 2082, bsMonth: 3, dayOffset: 1, duration: 5, reason: 'Family vacation to Pokhara' },
  { type: 'ANNUAL', status: 'APPROVED', bsYear: 2081, bsMonth: 10, dayOffset: 15, duration: 7, reason: 'Annual holiday' },
  { type: 'ANNUAL', status: 'REJECTED', bsYear: 2082, bsMonth: 6, dayOffset: 4, duration: 10, reason: 'Extended vacation' },

  // ── UNPAID leaves ──────────────────────────────────────────
  { type: 'UNPAID', status: 'APPROVED', bsYear: 2082, bsMonth: 5, dayOffset: 8, duration: 3, reason: 'Personal emergency' },
  { type: 'UNPAID', status: 'PENDING', bsYear: 2082, bsMonth: 9, dayOffset: 2, duration: 5, reason: 'Extended family matter' },

  // ── MATERNITY leave (long duration) ────────────────────────
  { type: 'MATERNITY', status: 'APPROVED', bsYear: 2082, bsMonth: 3, dayOffset: 1, duration: 60, reason: 'Maternity leave' },
  { type: 'MATERNITY', status: 'PENDING', bsYear: 2082, bsMonth: 8, dayOffset: 1, duration: 90, reason: 'Maternity leave request' },

  // ── PATERNITY leave ────────────────────────────────────────
  { type: 'PATERNITY', status: 'APPROVED', bsYear: 2082, bsMonth: 2, dayOffset: 10, duration: 10, reason: 'Paternity leave — newborn' },
  { type: 'PATERNITY', status: 'APPROVED', bsYear: 2081, bsMonth: 11, dayOffset: 5, duration: 15, reason: 'Paternity leave' },
];

async function main() {
  const TEST_SLUG = 'testco-nepal-seed';

  // ── Find the TestCo org ──────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({ where: { slug: TEST_SLUG } });
  if (!org) {
    console.error('❌ TestCo org not found. Run the main seed.ts first.');
    process.exit(1);
  }
  console.log(`✓ Found org: ${org.name} (${org.id})`);

  // ── 1. Ensure pricing plan + subscription exist ──────────────────────────
  let plan = await prisma.pricingPlan.findUnique({ where: { tier: 'OPERATIONS' } });
  if (!plan) {
    plan = await prisma.pricingPlan.create({
      data: {
        tier: 'OPERATIONS',
        displayName: 'Operations',
        description: 'Full features for testing',
        pricePerEmployee: 250,
        trialDaysMonthly: 30,
        featureLeave: true,
        featureManualCorrection: true,
        featureFullPayroll: true,
        featurePayrollWorkflow: true,
        featureReports: true,
        featureNotifications: true,
        featureOnboarding: true,
        featureAuditLog: true,
        auditLogRetentionDays: 30,
        featureFileDownload: true,
        featureDownloadReports: true,
        featureDownloadPayslips: true,
        featureDownloadAuditLog: true,
        featureDownloadLeaveRecords: true,
        isActive: true,
        sortOrder: 2,
      },
    });
    console.log('✓ Operations pricing plan created');
  } else {
    console.log('✓ Operations pricing plan already exists');
  }

  const existingSub = await prisma.orgSubscription.findUnique({
    where: { organizationId: org.id },
  });
  if (!existingSub) {
    await prisma.orgSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        isPriceLockedForever: true,
        setupFeeWaived: true,
        setupFeeWaivedNote: 'Test org — seed data',
        currentEmployeeCount: 18,
        assignedAt: new Date(),
      },
    });
    console.log('✓ Subscription created for TestCo (Operations — Active)');
  } else {
    console.log('✓ Subscription already exists');
  }

  // ── 2. Get admin user (for approvedBy) ────────────────────────────────────
  const adminMembership = await prisma.orgMembership.findFirst({
    where: { organizationId: org.id, role: 'ORG_ADMIN' },
    include: { user: true },
  });
  if (!adminMembership) {
    console.error('❌ No admin found in TestCo org');
    process.exit(1);
  }
  const adminUserId = adminMembership.userId;
  console.log(`✓ Admin user: ${adminMembership.user.firstName} ${adminMembership.user.lastName}`);

  // ── 3. Get employee memberships ───────────────────────────────────────────
  const memberships = await prisma.orgMembership.findMany({
    where: { organizationId: org.id, role: 'EMPLOYEE', isActive: true },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { employeeId: 'asc' },
  });

  if (memberships.length === 0) {
    console.error('❌ No employees found. Run main seed first.');
    process.exit(1);
  }
  console.log(`✓ Found ${memberships.length} employees\n`);

  // ── 4. Seed rich leave data ───────────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < memberships.length; i++) {
    const mem = memberships[i];
    const empName = `${mem.user.firstName} ${mem.user.lastName}`;

    // Each employee gets a subset of leave scenarios to create variety
    // Rotate through scenarios so different employees have different leave types
    const scenariosForEmp = LEAVE_SCENARIOS.filter((_, idx) => {
      // Distribute: employee 0 gets scenarios 0,3,6,9,12,15; employee 1 gets 1,4,7,10,13,16; etc.
      return idx % Math.min(memberships.length, 6) === i % 6;
    });

    // Also give some employees extra scenarios for density
    if (i < 3) {
      // First 3 employees get additional leaves for richer data
      scenariosForEmp.push(
        ...LEAVE_SCENARIOS.filter((_, idx) => idx % 5 === i % 5).slice(0, 2)
      );
    }

    // MATERNITY only for some employees (index-based to be deterministic)
    const filteredScenarios = scenariosForEmp.filter(s => {
      if (s.type === 'MATERNITY' && i % 4 !== 0) return false; // every 4th employee
      if (s.type === 'PATERNITY' && i % 4 !== 1) return false; // every 4th employee (offset)
      return true;
    });

    for (const scenario of filteredScenarios) {
      const monthStart = BS_START[scenario.bsYear]?.[scenario.bsMonth];
      if (!monthStart) continue;

      const leaveStart = addDays(monthStart, scenario.dayOffset);
      const leaveEnd = addDays(leaveStart, scenario.duration - 1);

      // Check for overlapping leave (avoid conflicts)
      const overlap = await prisma.leave.findFirst({
        where: {
          membershipId: mem.id,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [{ startDate: { lte: leaveEnd }, endDate: { gte: leaveStart } }],
        },
      });

      if (overlap) {
        skipped++;
        continue;
      }

      await prisma.leave.create({
        data: {
          membershipId: mem.id,
          organizationId: org.id,
          startDate: leaveStart,
          endDate: leaveEnd,
          bsStartYear: scenario.bsYear,
          bsStartMonth: scenario.bsMonth,
          bsStartDay: leaveStart.getDate(),
          bsEndYear: scenario.bsYear,
          bsEndMonth: scenario.duration > 25 ? Math.min(12, scenario.bsMonth + 2) : scenario.bsMonth,
          bsEndDay: leaveEnd.getDate(),
          reason: scenario.reason,
          type: scenario.type,
          status: scenario.status,
          approvedBy: scenario.status === 'APPROVED' ? adminUserId : null,
          approvedAt: scenario.status === 'APPROVED' ? addDays(leaveStart, -1) : null,
          rejectionMessage: scenario.status === 'REJECTED' ? 'Leave balance insufficient or conflicting schedule' : null,
        },
      });
      created++;
    }
    process.stdout.write(`  ✓ ${empName} (${mem.employeeId})\n`);
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────

  // Count leaves by type and status for verification
  const leaveStats = await prisma.leave.groupBy({
    by: ['type', 'status'],
    where: { organizationId: org.id },
    _count: true,
  });

  console.log(`\n📊 Leave data summary:`);
  const typeMap: Record<string, Record<string, number>> = {};
  for (const stat of leaveStats) {
    if (!typeMap[stat.type]) typeMap[stat.type] = {};
    typeMap[stat.type][stat.status] = stat._count;
  }
  for (const [type, statuses] of Object.entries(typeMap)) {
    const parts = Object.entries(statuses).map(([s, c]) => `${s}:${c}`).join(', ');
    console.log(`  ${type.padEnd(12)} → ${parts}`);
  }

  const totalLeaves = await prisma.leave.count({ where: { organizationId: org.id } });

  console.log(`
╔══════════════════════════════════════════════════════╗
║         LEAVE FILTER TEST DATA SEEDED ✅             ║
╠══════════════════════════════════════════════════════╣
║  Org:         TestCo Nepal Pvt. Ltd.                 ║
║  Total leaves: ${String(totalLeaves).padEnd(38)}║
║  New leaves:   ${String(created).padEnd(38)}║
║  Skipped:      ${String(skipped).padEnd(38)}║
║                                                      ║
║  Test as accountant:                                 ║
║    accountant@testco.np / Accountant@1234            ║
║                                                      ║
║  Filters to test:                                    ║
║    ✓ Search: "Aarav", "Priya", "EMP-001"            ║
║    ✓ Status: PENDING, APPROVED, REJECTED             ║
║    ✓ Type: SICK, CASUAL, ANNUAL, UNPAID,             ║
║           MATERNITY, PATERNITY                       ║
║    ✓ BS Year: 2081, 2082                             ║
║    ✓ BS Month: any month 1-12                        ║
║    ✓ Combinations of all above                       ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
