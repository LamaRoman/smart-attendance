import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  await p.pricingPlan.updateMany({ where: { tier: 'STARTER' }, data: { maxEmployees: 5 } });
  console.log('✓ STARTER: maxEmployees = 5');

  await p.pricingPlan.updateMany({ where: { tier: 'OPERATIONS' }, data: { maxEmployees: null } });
  console.log('✓ OPERATIONS: maxEmployees = null (unlimited)');
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());