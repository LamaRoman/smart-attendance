import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check which DB we are connected to
  const dbInfo = await prisma.$queryRaw<any[]>`
    SELECT current_database(), current_user, inet_server_port()
  `;
  console.log('DB connection:', dbInfo[0]);

  // Check existing orgs
  const orgs = await prisma.$queryRaw<any[]>`
    SELECT id, name, slug FROM organizations ORDER BY "createdAt" DESC LIMIT 10
  `;
  console.log('Recent orgs:', orgs);

  // Check for testco user
  const users = await prisma.$queryRaw<any[]>`
    SELECT id, email FROM users WHERE email LIKE '%testco%'
  `;
  console.log('Testco users:', users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());