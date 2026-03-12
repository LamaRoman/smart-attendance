// src/jobs/midnight-autoclose.job.ts
// ============================================================
// Runs daily at midnight Nepal time.
// Requires TZ=Asia/Kathmandu set in the environment (Railway).
// Finds all open CHECKED_IN attendance records and auto-closes
// them at the org/employee shift end time (not midnight) to
// prevent false overtime from forgotten clock-outs.
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
    select: {
      id: true,
      membershipId: true,
      checkInTime: true,
      membership: {
        select: {
          shiftEndTime: true,
          organization: {
            select: { workEndTime: true },
          },
        },
      },
    },
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
      // Determine shift end time string: individual override > org default
      const endTimeStr =
        record.membership.shiftEndTime || record.membership.organization.workEndTime;

      // Default: close at the current time (midnight when job runs)
      let checkOutTime = now;

      if (endTimeStr) {
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);

        // Compute shift end on the same calendar day as clock-in
        const shiftEndOnCheckInDay = new Date(record.checkInTime);
        shiftEndOnCheckInDay.setHours(endHour, endMinute, 0, 0);

        // Only cap if shift end is:
        //   - after the clock-in (prevents negative duration)
        //   - before midnight of that same day (i.e. before now, since job runs at midnight)
        if (shiftEndOnCheckInDay > record.checkInTime && shiftEndOnCheckInDay < now) {
          checkOutTime = shiftEndOnCheckInDay;
        }
      }

      const duration = Math.floor(
        (checkOutTime.getTime() - record.checkInTime.getTime()) / 60000
      );

      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime,
          checkOutMethod: 'MANUAL',
          duration,
          status: 'AUTO_CLOSED',
          notes:
            'Auto-closed at midnight by system — employee did not clock out. ' +
            `Check-out capped at shift end (${checkOutTime.toTimeString().slice(0, 5)}).`,
        },
      });

      closed++;
      log.info(
        {
          recordId: record.id,
          membershipId: record.membershipId,
          cappedCheckOut: checkOutTime.toISOString(),
          durationMinutes: duration,
        },
        'Record auto-closed (capped at shift end)'
      );
    } catch (err) {
      failed++;
      log.error({ err, recordId: record.id }, 'Failed to auto-close record');
    }
  }

  log.info({ closed, failed }, 'Midnight auto-close job completed');
}

export function startMidnightAutoCloseJob(): void {
  // '0 0 * * *' = midnight in server local time.
  // Requires TZ=Asia/Kathmandu in Railway environment variables.
  cron.schedule('0 0 * * *', async () => {
    try {
      await runMidnightAutoCloseJob();
    } catch (err) {
      log.error({ err }, 'Midnight auto-close job failed');
    }
  });
  log.info(
    'Midnight auto-close job scheduled — runs daily at 00:00 NPT (requires TZ=Asia/Kathmandu)'
  );
}