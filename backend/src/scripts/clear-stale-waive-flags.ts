import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.orgSubscription.updateMany({
    where: { setupFeeWaived: true },
    data: { setupFeeWaived: false, setupFeeWaivedNote: null },
  });
  console.log(`Cleared ${result.count} stale waive flag(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
