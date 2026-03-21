const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const org = await p.organization.findUnique({ where: { slug: 'testco-nepal-seed' } });
  const d = await p.attendanceRecord.deleteMany({ where: { organizationId: org.id, status: 'AUTO_CLOSED' } });
  console.log('Deleted ' + d.count + ' AUTO_CLOSED records');
  await p["$disconnect"]();
})();
