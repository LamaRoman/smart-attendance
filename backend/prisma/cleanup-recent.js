const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const org = await p.organization.findUnique({ where: { slug: 'testco-nepal-seed' } });
  const cutoff = new Date('2026-03-10T00:00:00');
  const d = await p.attendanceRecord.deleteMany({ 
    where: { organizationId: org.id, checkInTime: { gte: cutoff } } 
  });
  console.log('Deleted ' + d.count + ' records from Mar 10 onwards');
  await p["$disconnect"]();
})();
