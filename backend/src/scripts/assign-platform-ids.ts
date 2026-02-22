import prisma from '../lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: { platformId: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });

  console.log(`Found ${users.length} users without a Platform ID...`);

  for (const user of users) {
    let platformId: string;
    let unique = false;

    while (!unique) {
      platformId = String(Math.floor(10000000 + Math.random() * 90000000));
      const existing = await prisma.user.findUnique({ where: { platformId } });
      if (!existing) unique = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { platformId: platformId! },
    });

    console.log(`${user.email} → ${platformId!}`);
  }

  console.log('Done. All users now have a Platform ID.');
  await prisma.$disconnect();
}

main().catch(console.error);