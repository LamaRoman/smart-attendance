import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Production seed — Super Admin only\n');

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  if (password.length < 16) {
    console.error('SUPER_ADMIN_PASSWORD must be at least 16 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Super admin already exists: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        firstName: 'System',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`Super admin created: ${email}`);
  }

  console.log('\nProduction seed complete.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });