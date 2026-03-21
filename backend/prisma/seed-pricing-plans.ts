// prisma/seed-pricing-plans.ts
// ============================================================
// Seeds pricing plans with correct employee caps.
//
// Run:  npx ts-node prisma/seed-pricing-plans.ts
// Safe: uses upsert — won't duplicate, updates existing rows.
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding pricing plans...\n');

  // ── STARTER ──────────────────────────────────────────────
  // Free/low-cost tier with a hard employee cap.
  // maxEmployees = soft limit shown to user
  // hardEmployeeCap = actual enforcement point (slightly higher for admin buffer)
  const starter = await prisma.pricingPlan.upsert({
    where: { tier: 'STARTER' },
    update: {
      displayName: 'Starter',
      description: 'For small teams getting started',
      maxEmployees: 5,
      hardEmployeeCap: 10,
      pricePerEmployee: 0,
      trialDaysMonthly: 0,
    },
    create: {
      tier: 'STARTER',
      displayName: 'Starter',
      description: 'For small teams getting started',
      maxEmployees: 5,
      hardEmployeeCap: 10,
      pricePerEmployee: 0,
      trialDaysMonthly: 0,
      isActive: true,
    },
  });
  console.log(`✓ STARTER  — maxEmployees: ${starter.maxEmployees}, hardCap: ${starter.hardEmployeeCap}`);

  // ── OPERATIONS ───────────────────────────────────────────
  // Premium paid tier — no hard cap. Revenue scales with employee count.
  // Billing is per-employee, so capping would limit your own revenue.
  const operations = await prisma.pricingPlan.upsert({
    where: { tier: 'OPERATIONS' },
    update: {
      displayName: 'Operations',
      description: 'Full-featured plan for growing organizations',
      maxEmployees: null,
      hardEmployeeCap: null,
      trialDaysMonthly: 30,
    },
    create: {
      tier: 'OPERATIONS',
      displayName: 'Operations',
      description: 'Full-featured plan for growing organizations',
      maxEmployees: null,
      hardEmployeeCap: null,
      pricePerEmployee: 0,
      trialDaysMonthly: 30,
      isActive: true,
    },
  });
  console.log(`✓ OPERATIONS — maxEmployees: ${operations.maxEmployees}, hardCap: ${operations.hardEmployeeCap}`);

  console.log('\n✅ Pricing plans seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());