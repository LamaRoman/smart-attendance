/**
 * Cleanup script — removes test seed data from production
 * Targets exactly what seed.ts and seed2.ts created
 * Does NOT touch your real org or super admin
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup...\n');

  // ── Orgs to delete ───────────────────────────────────────────
  const testOrgNames = [
    'TestCo Nepal Pvt. Ltd.',
    'Demo Company Pvt. Ltd.',
  ];

  // ── Test user emails to delete ───────────────────────────────
  const testEmails = [
    // seed.ts (TestCo)
    'admin@testco.np',
    'accountant@testco.np',
    'aarav.sharma@testco.np',
    'priya.thapa@testco.np',
    'bikash.karki@testco.np',
    'sunita.rai@testco.np',
    'rohan.gurung@testco.np',
    'anita.poudel@testco.np',
    'sanjay.adhikari@testco.np',
    'meena.shrestha@testco.np',
    'deepak.bhandari@testco.np',
    'kavita.tamang@testco.np',
    'nabin.maharjan@testco.np',
    'sita.magar@testco.np',
    'prakash.limbu@testco.np',
    'rekha.basnet@testco.np',
    'suresh.dahal@testco.np',
    'bina.kc@testco.np',
    'ramesh.pandey@testco.np',
    'nisha.giri@testco.np',
    // seed2.ts (Demo Company)
    'orgadmin@democompany.com',
    'sita@democompany.com',
    'hari@democompany.com',
    'gita@democompany.com',
    'bikash@democompany.com',
    'anita@democompany.com',
    // Default super admin from seed2 (only delete if NOT your real super admin)
    // 'admin@smartattendance.com', // <-- uncomment if this is not your real super admin
  ];

  for (const orgName of testOrgNames) {
    const org = await prisma.organization.findFirst({ where: { name: orgName } });
    if (!org) {
      console.log(`Org not found, skipping: ${orgName}`);
      continue;
    }

    console.log(`Deleting org: ${org.name} (${org.id})`);

    // Delete in dependency order
    await prisma.attendanceAuditLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.attendanceRecord.deleteMany({ where: { organizationId: org.id } });
    await prisma.leave.deleteMany({ where: { organizationId: org.id } });
    await prisma.payrollRecord.deleteMany({ where: { organizationId: org.id } });
    await prisma.employeePaySettings.deleteMany({ where: { organizationId: org.id } });
    await prisma.subscriptionBillingLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.subscriptionAdminNote.deleteMany({
      where: { subscription: { organizationId: org.id } },
    });
    await prisma.orgSubscription.deleteMany({ where: { organizationId: org.id } });
    await prisma.qRCode.deleteMany({ where: { organizationId: org.id } });
    await prisma.systemConfig.deleteMany({ where: { organizationId: org.id } });
    await prisma.orgMembership.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });

    console.log(`Deleted org: ${org.name}\n`);
  }

  // ── Delete test users ────────────────────────────────────────
  for (const email of testEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`User not found, skipping: ${email}`);
      continue;
    }
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted user: ${email}`);
  }

  console.log('\nCleanup complete.');
  console.log('Your real org, super admin, and pricing plans are untouched.');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());