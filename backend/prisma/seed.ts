import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================================
  // 1. Super Admin (platform-level — no org membership)
  // ============================================================
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@smartattendance.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  const existingSuperAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });

  let superAdmin;
  if (existingSuperAdmin) {
    console.log(`✔ Super admin already exists: ${superAdminEmail}`);
    superAdmin = existingSuperAdmin;
  } else {
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
    console.log(`✔ Super admin created: ${superAdminEmail} / ${superAdminPassword}`);
  }

  // ============================================================
  // 2. Test Organization
  // ============================================================
  let org = await prisma.organization.findFirst({ where: { name: 'Demo Company Pvt. Ltd.' } });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Company Pvt. Ltd.',
        email: 'info@democompany.com',
        phone: '01-4123456',
        address: 'Kathmandu, Nepal',
        isActive: true,
        calendarMode: 'NEPALI',
      },
    });
    console.log(`✔ Organization created: ${org.name}`);
  } else {
    console.log(`✔ Organization already exists: ${org.name}`);
  }

  // ============================================================
  // 3. Org Admin (User + OrgMembership)
  // ============================================================
  const orgAdminEmail = 'orgadmin@democompany.com';
  let orgAdmin = await prisma.user.findUnique({ where: { email: orgAdminEmail } });

  if (!orgAdmin) {
    orgAdmin = await prisma.user.create({
      data: {
        email: orgAdminEmail,
        password: await bcrypt.hash('OrgAdmin@123', 12),
        firstName: 'Ram',
        lastName: 'Sharma',
        role: Role.ORG_ADMIN, // Platform-level hint
        isActive: true,
      },
    });

    await prisma.orgMembership.create({
      data: {
        userId: orgAdmin.id,
        organizationId: org.id,
        role: Role.ORG_ADMIN,
        isActive: true,
      },
    });
    console.log(`✔ Org admin created: ${orgAdminEmail} / OrgAdmin@123`);
  } else {
    console.log(`✔ Org admin already exists: ${orgAdminEmail}`);
  }

  // ============================================================
  // 4. Test Employees (User + OrgMembership with employeeId)
  // ============================================================
  const employees = [
    { email: 'sita@democompany.com', firstName: 'Sita', lastName: 'Thapa', employeeId: 'EMP-10001' },
    { email: 'hari@democompany.com', firstName: 'Hari', lastName: 'Basnet', employeeId: 'EMP-10002' },
    { email: 'gita@democompany.com', firstName: 'Gita', lastName: 'Karki', employeeId: 'EMP-10003' },
    { email: 'bikash@democompany.com', firstName: 'Bikash', lastName: 'Rai', employeeId: 'EMP-10004' },
    { email: 'anita@democompany.com', firstName: 'Anita', lastName: 'Gurung', employeeId: 'EMP-10005' },
  ];

  for (const emp of employees) {
    const existing = await prisma.user.findUnique({ where: { email: emp.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: emp.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          password: await bcrypt.hash('Employee@123', 12),
          role: Role.EMPLOYEE, // Platform-level hint
          isActive: true,
        },
      });

      // Create OrgMembership with employeeId and attendance PIN
      const pinHash = await bcrypt.hash('1234', 12);
      await prisma.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: Role.EMPLOYEE,
          employeeId: emp.employeeId,
          attendancePinHash: pinHash,
          isActive: true,
        },
      });

      console.log(`✔ Employee created: ${emp.firstName} ${emp.lastName} (${emp.employeeId}) / Employee@123 / PIN: 1234`);
    } else {
      console.log(`✔ Employee already exists: ${emp.email}`);
    }
  }

  // ============================================================
  // 5. Pay Settings for employees (keyed by membershipId)
  // ============================================================
  const allMemberships = await prisma.orgMembership.findMany({
    where: { organizationId: org.id, role: Role.EMPLOYEE, isActive: true },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const salaries = [35000, 40000, 30000, 45000, 38000];

  for (let i = 0; i < allMemberships.length; i++) {
    const membership = allMemberships[i];
    const existing = await prisma.employeePaySettings.findUnique({
      where: { membershipId: membership.id },
    });

    if (!existing) {
      await prisma.employeePaySettings.create({
        data: {
          membershipId: membership.id,
          organizationId: org.id,
          basicSalary: salaries[i] || 35000,
          dearnessAllowance: 2000,
          transportAllowance: 1500,
          medicalAllowance: 1000,
          otherAllowances: 0,
          overtimeRatePerHour: 200,
          ssfEnabled: true,
          employeeSsfRate: 11,
          employerSsfRate: 20,
          tdsEnabled: true,
        },
      });
      console.log(`✔ Pay settings created for: ${membership.user.firstName} ${membership.user.lastName} -- NPR ${salaries[i]}`);
    }
  }

  // ============================================================
  // 6. System Config defaults
  // ============================================================
  const defaultConfigs = [
    { key: 'scan_cooldown_minutes', value: '2', description: 'Minutes between QR scans for same employee' },
    { key: 'max_daily_scans', value: '4', description: 'Maximum scan actions per employee per day' },
    { key: 'auto_close_hours', value: '12', description: 'Auto-close checked-in records after this many hours' },
    { key: 'working_hours_per_day', value: '8', description: 'Standard working hours per day' },
  ];

  for (const cfg of defaultConfigs) {
    const existing = await prisma.systemConfig.findUnique({
      where: { organizationId_key: { organizationId: org.id, key: cfg.key } },
    });

    if (!existing) {
      await prisma.systemConfig.create({
        data: { organizationId: org.id, ...cfg },
      });
      console.log(`✔ Config set: ${cfg.key} = ${cfg.value}`);
    }
  }

  // ============================================================
  // 7. Pricing Plans
  // ============================================================
  const starterPlan = await prisma.pricingPlan.upsert({
    where: { tier: 'STARTER' },
    update: {},
    create: {
      tier: 'STARTER',
      displayName: 'Starter',
      description: 'Free forever for micro teams. Core Nepal features included.',
      pricePerEmployee: 0,
      maxEmployees: 5,
      hardEmployeeCap: 5,
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
  console.log(`✔ Pricing plan seeded: ${starterPlan.displayName}`);

  const operationsPlan = await prisma.pricingPlan.upsert({
    where: { tier: 'OPERATIONS' },
    update: {},
    create: {
      tier: 'OPERATIONS',
      displayName: 'Operations',
      description: 'Full features. Rs. 250 per employee per month.',
      pricePerEmployee: 250,
      hardEmployeeCap: 100,
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
  console.log(`✔ Pricing plan seeded: ${operationsPlan.displayName}`);

  // ============================================================
  // 8. OrgSubscription for Demo Company (Operations)
  // ============================================================
  const existingSubscription = await prisma.orgSubscription.findUnique({
    where: { organizationId: org.id },
  });

  if (!existingSubscription) {
    await prisma.orgSubscription.create({
      data: {
        organizationId: org.id,
        planId: operationsPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        isPriceLockedForever: true,
        setupFeeWaived: true,
        setupFeeWaivedNote: 'Demo org -- founding member',
        currentEmployeeCount: 5,
        assignedBy: superAdmin.id,
        assignedAt: new Date(),
      },
    });
    console.log(`✔ Subscription created for: ${org.name} (Operations -- Founding Member)`);
  } else {
    console.log(`✔ Subscription already exists for: ${org.name}`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('=== Login Credentials ===');
  console.log(`Super Admin:  ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`Org Admin:    ${orgAdminEmail} / OrgAdmin@123`);
  console.log(`Employees:    [any]@democompany.com / Employee@123 / PIN: 1234`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });