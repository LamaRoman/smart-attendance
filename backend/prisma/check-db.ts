import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({ log: ['query'] });

async function check() {
  const orgs = await p.organization.findMany();
  console.log('Orgs found:', orgs.length);
  orgs.forEach((o) => console.log(' -', o.id, o.name, o.slug));
  const users = await p.user.findMany();
  console.log('Users found:', users.length);
  await p.$disconnect();
}

check();