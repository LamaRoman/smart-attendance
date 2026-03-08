/**
 * SEED SCRIPT — Test Org with 20 employees, 3 BS years of data
 * Run: npx ts-node prisma/seed.ts
 * Safe to re-run — skips if test org already exists
 */
import 'dotenv/config';
import {
  PrismaClient, Role, LeaveType, LeaveStatus,
  PayrollStatus, CheckInMethod, AttendanceRecordStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function platformId(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 12);
}

async function hashPin(p: string): Promise<string> {
  return bcrypt.hash(p, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── BS → AD start dates (approximate, 1st of each BS month) ──────────────────

const BS_START: Record<number, Record<number, Date>> = {
  2080: {
    1:  new Date('2023-04-14'), 2:  new Date('2023-05-15'),
    3:  new Date('2023-06-15'), 4:  new Date('2023-07-17'),
    5:  new Date('2023-08-17'), 6:  new Date('2023-09-17'),
    7:  new Date('2023-10-18'), 8:  new Date('2023-11-17'),
    9:  new Date('2023-12-16'), 10: new Date('2024-01-15'),
    11: new Date('2024-02-13'), 12: new Date('2024-03-14'),
  },
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

// ── Payroll calculation (Nepal standard: 30-day divisor, SSF on effective basic)

function calcPayroll(
  basic: number,
  da: number, ta: number, ma: number, oa: number,
  daysAbsent: number,
  overtimeHours: number, overtimeRate: number,
  bsMonth: number,
  isMarried: boolean,
) {
  const absenceDeduction = Math.round((basic / 30) * daysAbsent * 100) / 100;
  const effectiveBasic   = Math.max(0, basic - absenceDeduction);
  const allowances       = da + ta + ma + oa;
  const overtimePay      = Math.round(overtimeHours * overtimeRate * 100) / 100;
  const grossSalary      = Math.round((effectiveBasic + allowances + overtimePay) * 100) / 100;

  const employeeSsf = effectiveBasic > 0 ? Math.round(effectiveBasic * 0.11 * 100) / 100 : 0;
  const employerSsf = effectiveBasic > 0 ? Math.round(effectiveBasic * 0.20 * 100) / 100 : 0;

  // Simplified Nepal TDS
  const annualTaxable  = (grossSalary - employeeSsf) * 12;
  const firstSlab      = isMarried ? 600000 : 500000;
  let tds = 0;
  if (annualTaxable > firstSlab) {
    const aboveFirst = Math.min(annualTaxable - firstSlab, 200000);
    const above700k  = Math.max(0, annualTaxable - firstSlab - 200000);
    tds = Math.round(((aboveFirst * 0.10) + (above700k * 0.20)) / 12 * 100) / 100;
  }

  const dashainBonus   = bsMonth === 6 ? basic : 0;
  const totalDeductions = Math.round((absenceDeduction + employeeSsf + tds) * 100) / 100;
  const netSalary       = Math.max(0, Math.round((grossSalary + dashainBonus - totalDeductions) * 100) / 100);

  return { absenceDeduction, effectiveBasic, overtimePay, grossSalary, employeeSsf, employerSsf, tds, dashainBonus, totalDeductions, netSalary };
}

// ── Employee profiles ─────────────────────────────────────────────────────────

const EMPLOYEES = [
  { firstName: 'Aarav',    lastName: 'Sharma',     basic: 55000, da: 5000, ta: 3000, ma: 2000, oa: 0,    otRate: 250, married: true  },
  { firstName: 'Priya',    lastName: 'Thapa',      basic: 48000, da: 4000, ta: 2500, ma: 1500, oa: 0,    otRate: 220, married: false },
  { firstName: 'Bikash',   lastName: 'Karki',      basic: 62000, da: 6000, ta: 3000, ma: 2500, oa: 1000, otRate: 280, married: true  },
  { firstName: 'Sunita',   lastName: 'Rai',        basic: 35000, da: 3000, ta: 2000, ma: 1000, oa: 0,    otRate: 160, married: false },
  { firstName: 'Rohan',    lastName: 'Gurung',     basic: 72000, da: 7000, ta: 3500, ma: 3000, oa: 2000, otRate: 330, married: true  },
  { firstName: 'Anita',    lastName: 'Poudel',     basic: 28000, da: 2500, ta: 1500, ma: 1000, oa: 0,    otRate: 130, married: false },
  { firstName: 'Sanjay',   lastName: 'Adhikari',   basic: 45000, da: 4000, ta: 2500, ma: 1500, oa: 500,  otRate: 205, married: true  },
  { firstName: 'Meena',    lastName: 'Shrestha',   basic: 38000, da: 3500, ta: 2000, ma: 1500, oa: 0,    otRate: 175, married: false },
  { firstName: 'Deepak',   lastName: 'Bhandari',   basic: 80000, da: 8000, ta: 4000, ma: 3500, oa: 2500, otRate: 365, married: true  },
  { firstName: 'Kavita',   lastName: 'Tamang',     basic: 32000, da: 3000, ta: 1500, ma: 1000, oa: 0,    otRate: 145, married: false },
  { firstName: 'Nabin',    lastName: 'Maharjan',   basic: 52000, da: 5000, ta: 3000, ma: 2000, oa: 1000, otRate: 240, married: true  },
  { firstName: 'Sita',     lastName: 'Magar',      basic: 29000, da: 2500, ta: 1500, ma: 1000, oa: 0,    otRate: 130, married: false },
  { firstName: 'Prakash',  lastName: 'Limbu',      basic: 41000, da: 3500, ta: 2500, ma: 1500, oa: 500,  otRate: 190, married: true  },
  { firstName: 'Rekha',    lastName: 'Basnet',     basic: 36000, da: 3000, ta: 2000, ma: 1000, oa: 0,    otRate: 165, married: false },
  { firstName: 'Suresh',   lastName: 'Dahal',      basic: 67000, da: 6500, ta: 3500, ma: 3000, oa: 1500, otRate: 305, married: true  },
  { firstName: 'Bina',     lastName: 'KC',         basic: 31000, da: 2500, ta: 1500, ma: 1000, oa: 0,    otRate: 140, married: false },
  { firstName: 'Ramesh',   lastName: 'Pandey',     basic: 58000, da: 5500, ta: 3000, ma: 2500, oa: 1000, otRate: 265, married: true  },
  { firstName: 'Nisha',    lastName: 'Giri',       basic: 27000, da: 2000, ta: 1500, ma: 1000, oa: 0,    otRate: 120, married: false },
];

const LEAVE_TYPES: LeaveType[] = ['SICK', 'CASUAL', 'ANNUAL', 'UNPAID'];
const PAYROLL_STATUSES: PayrollStatus[] = ['PROCESSED', 'APPROVED', 'PAID'];
const BS_YEARS = [2080, 2081, 2082];

// ── Main seed ─────────────────────────────────────────────────────────────────

async function main() {
  const TEST_SLUG = 'testco-nepal-seed';

  // Idempotent — skip if already seeded
  const existing = await prisma.organization.findUnique({ where: { slug: TEST_SLUG } });
  if (existing) {
    console.log('✓ Test org already exists — skipping seed.');
    return;
  }

  console.log('🌱 Seeding test org...');

  // ── 1. Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name:         'TestCo Nepal Pvt. Ltd.',
      slug:         TEST_SLUG,
      calendarMode: 'NEPALI',
    },
  });
  console.log(`✓ Org created: ${org.name} (${org.id})`);

  // ── 2. Admin user ────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      email:      'admin@testco.np',
      password:   await hashPassword('Admin@1234'),
      firstName:  'Test',
      lastName:   'Admin',
      platformId: platformId(),
      role:       'ORG_ADMIN',
    },
  });
  const adminMembership = await prisma.orgMembership.create({
    data: {
      userId:           adminUser.id,
      organizationId:   org.id,
      role:             'ORG_ADMIN',
      employeeId:       'EMP-ADMIN',
      attendancePinHash: await hashPin('0000'),
      isActive:         true,
      joinedAt:         new Date('2023-04-14'),
    },
  });
  console.log(`✓ Admin: ${adminUser.email}`);

  // ── 3. Accountant user ───────────────────────────────────────────────────────
  const accountantUser = await prisma.user.create({
    data: {
      email:      'accountant@testco.np',
      password:   await hashPassword('Accountant@1234'),
      firstName:  'Test',
      lastName:   'Accountant',
      platformId: platformId(),
      role:       'ORG_ACCOUNTANT',
    },
  });
  await prisma.orgMembership.create({
    data: {
      userId:           accountantUser.id,
      organizationId:   org.id,
      role:             'ORG_ACCOUNTANT',
      employeeId:       'EMP-ACC',
      attendancePinHash: await hashPin('1111'),
      isActive:         true,
      joinedAt:         new Date('2023-04-14'),
    },
  });
  console.log(`✓ Accountant: ${accountantUser.email}`);

  // ── 4. Employees ─────────────────────────────────────────────────────────────
  const memberships: Array<{ id: string; profile: typeof EMPLOYEES[0]; employeeId: string }> = [];

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];
    const empId = `EMP-${String(i + 1).padStart(3, '0')}`;

    const user = await prisma.user.create({
      data: {
        email:      `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@testco.np`,
        password:   await hashPassword('Employee@1234'),
        firstName:  emp.firstName,
        lastName:   emp.lastName,
        platformId: platformId(),
        role:       'EMPLOYEE',
      },
    });

    const membership = await prisma.orgMembership.create({
      data: {
        userId:           user.id,
        organizationId:   org.id,
        role:             'EMPLOYEE',
        employeeId:       empId,
        attendancePinHash: await hashPin(String(1000 + i + 1)),
        isActive:         true,
        joinedAt:         new Date('2023-04-14'),
      },
    });

    // Pay settings
    await prisma.employeePaySettings.create({
      data: {
        membershipId:       membership.id,
        organizationId:     org.id,
        basicSalary:        emp.basic,
        dearnessAllowance:  emp.da,
        transportAllowance: emp.ta,
        medicalAllowance:   emp.ma,
        otherAllowances:    emp.oa,
        overtimeRatePerHour: emp.otRate,
        ssfEnabled:         true,
        employeeSsfRate:    11,
        employerSsfRate:    20,
        pfEnabled:          i % 3 === 0, // every 3rd employee has PF
        employeePfRate:     10,
        employerPfRate:     10,
        citEnabled:         false,
        citAmount:          0,
        tdsEnabled:         emp.basic >= 45000,
        isMarried:          emp.married,
        advanceDeduction:   0,
        bankName:           pick(['Nepal Bank Ltd', 'NIC Asia Bank', 'Himalayan Bank', 'Nabil Bank', 'Everest Bank']),
        bankAccountName:    `${emp.firstName} ${emp.lastName}`,
        bankAccountNumber:  String(rnd(1000000000, 9999999999)),
      },
    });

    memberships.push({ id: membership.id, profile: emp, employeeId: empId });
    process.stdout.write(`✓ Employee ${empId}: ${emp.firstName} ${emp.lastName}\n`);
  }

  console.log('\n📅 Generating 3 years of attendance, leaves & payroll...\n');

  // ── 5. Attendance + Payroll per BS year/month ────────────────────────────────
  for (const bsYear of BS_YEARS) {
    for (let bsMonth = 1; bsMonth <= 12; bsMonth++) {
      const monthStart = BS_START[bsYear][bsMonth];
      const monthEnd   = bsMonth < 12
        ? BS_START[bsYear][bsMonth + 1]
        : BS_START[bsYear === 2082 ? 2082 : bsYear][bsMonth]; // approximate end

      const adYear  = monthStart.getFullYear();
      const adMonth = monthStart.getMonth() + 1;
      const workingDays = 26; // standard working days for Nepal monthly payroll

      // Skip future months (beyond March 2026)
      const now = new Date('2026-03-07');
      if (monthStart > now) continue;

      for (const mem of memberships) {
        const emp = mem.profile;

        // Randomise attendance: 0–4 absent days, occasional overtime
        const daysAbsent   = rnd(0, 4);
        const daysPresent  = workingDays - daysAbsent;
        const overtimeHrs  = rnd(0, 1) === 1 ? rnd(2, 12) : 0; // 50% chance of OT

        // Create attendance records (one per working day present)
        const attendanceRecords = [];
        let dayOffset = 0;
        let recorded  = 0;
        while (recorded < daysPresent && dayOffset < 31) {
          const day = addDays(monthStart, dayOffset);
          // Skip weekends (Sat = 6, in Nepal Sat is holiday)
          if (day.getDay() !== 6) {
            const checkIn  = new Date(day);
            checkIn.setHours(9, rnd(0, 15), 0, 0);
            const checkOut = new Date(day);
            checkOut.setHours(17, rnd(0, 30), 0, 0);
            const duration = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);

            attendanceRecords.push({
              membershipId:  mem.id,
              organizationId: org.id,
              checkInTime:   checkIn,
              checkOutTime:  checkOut,
              checkInMethod: 'QR_SCAN' as CheckInMethod,
              checkOutMethod: 'QR_SCAN' as CheckInMethod,
              duration,
              status:        'CHECKED_OUT' as AttendanceRecordStatus,
              isActive:      true,
              isManualEntry: false,
            });
            recorded++;
          }
          dayOffset++;
        }

        if (attendanceRecords.length > 0) {
          await prisma.attendanceRecord.createMany({ data: attendanceRecords });
        }

        // Calculate payroll
        const calc = calcPayroll(
          emp.basic, emp.da, emp.ta, emp.ma, emp.oa,
          daysAbsent, overtimeHrs, emp.otRate,
          bsMonth, emp.married,
        );

        // Older months are PAID, recent months PROCESSED/APPROVED
        const monthAge = (2082 - bsYear) * 12 + (12 - bsMonth);
        const status: PayrollStatus = monthAge === 0 ? 'DRAFT'
          : monthAge <= 2 ? 'PROCESSED'
          : monthAge <= 4 ? 'APPROVED'
          : 'PAID';

        await prisma.payrollRecord.create({
          data: {
            membershipId:       mem.id,
            organizationId:     org.id,
            year:               adYear,
            month:              adMonth,
            bsYear,
            bsMonth,
            workingDaysInMonth: workingDays,
            holidaysInMonth:    2,
            daysPresent,
            daysAbsent,
            paidLeaveDays:      0,
            unpaidLeaveDays:    daysAbsent,
            overtimeHours:      overtimeHrs,
            basicSalary:        emp.basic,
            dearnessAllowance:  emp.da,
            transportAllowance: emp.ta,
            medicalAllowance:   emp.ma,
            otherAllowances:    emp.oa,
            overtimePay:        calc.overtimePay,
            grossSalary:        calc.grossSalary,
            absenceDeduction:   calc.absenceDeduction,
            employeeSsf:        calc.employeeSsf,
            employerSsf:        calc.employerSsf,
            employeePf:         0,
            employerPf:         0,
            citDeduction:       0,
            advanceDeduction:   0,
            tds:                calc.tds,
            otherDeductions:    0,
            totalDeductions:    calc.totalDeductions,
            dashainBonus:       calc.dashainBonus,
            isMarried:          emp.married,
            netSalary:          calc.netSalary,
            status,
            processedAt:        status !== 'DRAFT'    ? addDays(monthStart, 35) : null,
            approvedAt:         status === 'APPROVED' || status === 'PAID' ? addDays(monthStart, 37) : null,
            paidAt:             status === 'PAID'     ? addDays(monthStart, 40) : null,
          },
        });
      }

      process.stdout.write(`  ✓ BS ${bsYear}/${bsMonth} — ${memberships.length} employees\n`);
    }

    // ── 6. Leaves (2–4 per employee per year) ──────────────────────────────────
    for (const mem of memberships) {
      const leaveCount = rnd(2, 4);
      for (let l = 0; l < leaveCount; l++) {
        const bsMonth    = rnd(1, 12);
        const leaveStart = addDays(BS_START[bsYear][bsMonth], rnd(1, 20));
        const leaveDays  = rnd(1, 3);
        const leaveEnd   = addDays(leaveStart, leaveDays - 1);
        const status: LeaveStatus = pick(['APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'PENDING']);

        await prisma.leave.create({
          data: {
            membershipId:   mem.id,
            organizationId: org.id,
            startDate:      leaveStart,
            endDate:        leaveEnd,
            bsStartYear:    bsYear,
            bsStartMonth:   bsMonth,
            bsStartDay:     leaveStart.getDate(),
            bsEndYear:      bsYear,
            bsEndMonth:     bsMonth,
            bsEndDay:       leaveEnd.getDate(),
            reason:         pick([
              'Feeling unwell',
              'Family function',
              'Personal work',
              'Medical appointment',
              'Festival travel',
            ]),
            type:           pick(LEAVE_TYPES),
            status,
            approvedBy:     status === 'APPROVED' ? adminUser.id : null,
            approvedAt:     status === 'APPROVED' ? addDays(leaveStart, -1) : null,
            rejectionMessage: status === 'REJECTED' ? 'Insufficient leave balance' : null,
          },
        });
      }
    }

    console.log(`✓ BS Year ${bsYear} leaves seeded`);
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║              SEED COMPLETE ✅                        ║
╠══════════════════════════════════════════════════════╣
║  Org:         TestCo Nepal Pvt. Ltd.                 ║
║  Admin:       admin@testco.np / Admin@1234           ║
║  Accountant:  accountant@testco.np / Accountant@1234 ║
║  Employees:   employee.name@testco.np / Employee@1234║
║  Employee PIN: 1001, 1002, ... 1018                  ║
║  BS Years:    2080, 2081, 2082                        ║
║  Payroll:     ${memberships.length} employees × 36 months            ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
