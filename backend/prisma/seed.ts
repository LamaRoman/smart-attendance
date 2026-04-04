// ============================================================
// PRODUCTION SEED — Smart Attendance
// Creates ONLY: Super Admin + system-level data
// No demo orgs, employees, attendance, or payroll
//
// Required env vars:
//   SUPER_ADMIN_EMAIL    (default: admin@smartattendance.com)
//   SUPER_ADMIN_PASSWORD (REQUIRED — no default)
//
// Run: npx prisma db seed
// Dev seed: npx ts-node prisma/seed-dev.ts
// ============================================================

import {
  PrismaClient,
  Role,
  HolidayType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Production seed starting...\n');

  // ============================================================
  // 1. SUPER ADMIN — password from env (required)
  // ============================================================
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@smartattendance.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    console.error('❌ SUPER_ADMIN_PASSWORD environment variable is required.');
    console.error('   Set it before running seed:');
    console.error('   SUPER_ADMIN_PASSWORD="YourStrongPassword" npx prisma db seed');
    process.exit(1);
  }

  if (superAdminPassword.length < 8) {
    console.error('❌ SUPER_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: await bcrypt.hash(superAdminPassword, 12),
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Super admin created: ${superAdminEmail}`);
  } else {
    console.log(`⏭  Super admin already exists: ${superAdminEmail}`);
  }

  // ============================================================
  // 2. PRICING PLANS
  // ============================================================
  await prisma.pricingPlan.upsert({
    where: { tier: 'STARTER' },
    update: {},
    create: {
      tier: 'STARTER',
      displayName: 'Starter',
      description: 'Free forever for micro teams.',
      pricePerEmployee: 0,
      maxEmployees: 5,
      trialDaysMonthly: 0,
      featureLeave: true,
      featureManualCorrection: false,
      featureFullPayroll: true,
      featurePayrollWorkflow: false,
      featureReports: true,
      featureNotifications: false,
      featureOnboarding: false,
      featureAuditLog: false,
      featureFileDownload: false,
      featureDownloadReports: false,
      featureDownloadPayslips: false,
      featureDownloadAuditLog: false,
      featureDownloadLeaveRecords: false,
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.pricingPlan.upsert({
    where: { tier: 'OPERATIONS' },
    update: {},
    create: {
      tier: 'OPERATIONS',
      displayName: 'Operations',
      description: 'Full features. Rs. 250 per employee per month.',
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
  console.log('✅ Pricing plans seeded: STARTER, OPERATIONS');

  // ============================================================
  // 3. PLATFORM CONFIG
  // ============================================================
  const platformConfigs = [
    { key: 'trial_duration_days', value: '30', valueType: 'number', label: 'Trial Duration (Days)', description: 'Default trial period for new orgs' },
    { key: 'max_employees_free', value: '5', valueType: 'number', label: 'Max Employees (Free)', description: 'Max employees on Starter plan' },
    { key: 'ssf_employee_rate', value: '11', valueType: 'number', label: 'SSF Employee Rate (%)', description: 'Default SSF employee contribution rate' },
    { key: 'ssf_employer_rate', value: '20', valueType: 'number', label: 'SSF Employer Rate (%)', description: 'Default SSF employer contribution rate' },
  ];

  for (const pc of platformConfigs) {
    const existing = await prisma.platformConfig.findUnique({ where: { key: pc.key } });
    if (!existing) {
      await prisma.platformConfig.create({ data: pc });
    }
  }
  console.log(`✅ Platform config seeded (${platformConfigs.length} entries)`);

  // ============================================================
  // 4. NEPAL PUBLIC HOLIDAYS — BS 2082
  // ============================================================
  const holidays = [
    { name: 'New Year (Nawa Barsha)', nameNepali: 'नव वर्ष', bsYear: 2082, bsMonth: 1, bsDay: 1, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Labour Day', nameNepali: 'श्रमिक दिवस', bsYear: 2082, bsMonth: 1, bsDay: 18, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Republic Day', nameNepali: 'गणतन्त्र दिवस', bsYear: 2082, bsMonth: 2, bsDay: 15, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Constitution Day', nameNepali: 'संविधान दिवस', bsYear: 2082, bsMonth: 6, bsDay: 3, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Dashain (Ghatasthapana)', nameNepali: 'घटस्थापना', bsYear: 2082, bsMonth: 6, bsDay: 21, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Dashain (Vijaya Dashami)', nameNepali: 'विजया दशमी', bsYear: 2082, bsMonth: 6, bsDay: 30, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Tihar (Laxmi Puja)', nameNepali: 'लक्ष्मी पूजा', bsYear: 2082, bsMonth: 7, bsDay: 15, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Tihar (Mha Puja)', nameNepali: 'म्ह पूजा', bsYear: 2082, bsMonth: 7, bsDay: 16, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Tihar (Bhai Tika)', nameNepali: 'भाई टीका', bsYear: 2082, bsMonth: 7, bsDay: 17, type: HolidayType.PUBLIC_HOLIDAY },
    { name: 'Christmas Day', nameNepali: 'क्रिसमस', bsYear: 2082, bsMonth: 9, bsDay: 10, type: HolidayType.PUBLIC_HOLIDAY },
  ];

  let holidaysSeeded = 0;
  for (const h of holidays) {
    const existing = await prisma.holiday.findFirst({
      where: { bsYear: h.bsYear, bsMonth: h.bsMonth, bsDay: h.bsDay, organizationId: null },
    });

    if (!existing) {
      const { bsToAD } = await import('../src/lib/nepali-date');
      const adDate = bsToAD({ year: h.bsYear, month: h.bsMonth, day: h.bsDay });

      await prisma.holiday.create({
        data: {
          organizationId: null,
          name: h.name,
          nameNepali: h.nameNepali,
          date: adDate,
          bsYear: h.bsYear,
          bsMonth: h.bsMonth,
          bsDay: h.bsDay,
          type: h.type,
          isRecurring: false,
          isActive: true,
        },
      });
      holidaysSeeded++;
    }
  }
  console.log(`✅ Holidays seeded (${holidaysSeeded} public holidays for BS 2082)`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n🎉 Production seed complete!\n');
  console.log('='.repeat(50));
  console.log('WHAT WAS SEEDED');
  console.log('='.repeat(50));
  console.log(`✅ 1 Super Admin (${superAdminEmail})`);
  console.log('✅ 2 Pricing Plans (Starter, Operations)');
  console.log('✅ 4 Platform Config entries');
  console.log('✅ 10 Nepal Public Holidays (BS 2082)');
  console.log('='.repeat(50));
  console.log('');
  console.log('NEXT STEPS:');
  console.log('  1. Log in as Super Admin at your frontend URL');
  console.log('  2. Create an Organization');
  console.log('  3. Assign a subscription plan');
  console.log('  4. Create an Org Admin for that organization');
  console.log('  5. Org Admin can then add employees');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });