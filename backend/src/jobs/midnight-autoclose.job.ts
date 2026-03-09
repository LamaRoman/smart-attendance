// src/jobs/midnight-autoclose.job.ts
// ============================================================
// Runs daily at midnight Nepal time (UTC+5:45 = 18:15 UTC).
// Finds all open CHECKED_IN attendance records and auto-closes
// them. This handles employees who forgot to clock out.
// ============================================================
import cron from 'node-cron';
import prisma from '../lib/prisma';
import { createLogger } from '../logger';

const log = createLogger('midnight-autoclose-job');

export async function runMidnightAutoCloseJob(): Promise<void> {
  log.info('Midnight auto-close job started');

  const now = new Date();

  const openRecords = await prisma.attendanceRecord.findMany({
    where: { status: 'CHECKED_IN' },
    select: { id: true, membershipId: true, checkInTime: true },
  });

  if (openRecords.length === 0) {
    log.info('No open attendance records to auto-close');
    return;
  }

  log.info({ count: openRecords.length }, 'Found open records to auto-close');

  let closed = 0;
  let failed = 0;

  for (const record of openRecords) {
    try {
      const duration = Math.floor(
        (now.getTime() - record.checkInTime.getTime()) / 60000
      );

      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: now,
          checkOutMethod: 'MANUAL',
          duration,
          status: 'AUTO_CLOSED',
          notes: 'Auto-closed at midnight by system — employee did not clock out',
        },
      });

      closed++;
      log.info(
        { recordId: record.id, membershipId: record.membershipId },
        'Record auto-closed at midnight'
      );
    } catch (err) {
      failed++;
      log.error({ err, recordId: record.id }, 'Failed to auto-close record');
    }
  }

  log.info({ closed, failed }, 'Midnight auto-close job completed');
}

export function startMidnightAutoCloseJob(): void {
  // 18:15 UTC = 00:00 NPT (UTC+5:45)
  cron.schedule('15 18 * * *', async () => {
    try {
      await runMidnightAutoCloseJob();
    } catch (err) {
      log.error({ err }, 'Midnight auto-close job failed');
    }
  });
  log.info('Midnight auto-close job scheduled — runs daily at 00:00 NPT');
}