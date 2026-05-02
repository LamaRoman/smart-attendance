// src/jobs/midnight-autoclose.job.ts
// ============================================================
// Auto-closes stale CHECKED_IN attendance records.
//
// Three triggers (belt-and-suspenders):
//   1. Midnight cron  — runs daily at 00:00 NPT
//   2. Startup catch-up — runs once when server boots
//   3. API endpoint    — manual trigger by admin
//
// Only closes records where the employee's shift end has passed
// on the check-in day. Today's active check-ins are never touched.
// ============================================================
import cron from 'node-cron';
import prisma from '../lib/prisma';
import { createLogger } from '../logger';
import { withJobAlerts } from './withJobAlerts';
import { alerter } from '../lib/alerter';

const log = createLogger('midnight-autoclose-job');

/**
 * Core auto-close logic.
 * @param trigger - Label for logging (e.g. 'midnight-cron', 'startup', 'api')
 */
export async function runAutoClose(trigger: string = 'midnight-cron'): Promise<{ closed: number; skipped: number; failed: number }> {
  log.info({ trigger }, 'Auto-close job started');

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
    log.info({ trigger }, 'No open attendance records to auto-close');
    return { closed: 0, skipped: 0, failed: 0 };
  }

  log.info({ trigger, count: openRecords.length }, 'Found open records to evaluate');

  let closed = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of openRecords) {
    try {
      // Determine shift end time: employee override > org default > fallback 18:00
      const endTimeStr =
        record.membership.shiftEndTime ||
        record.membership.organization.workEndTime ||
        '18:00';

      const [endHour, endMinute] = endTimeStr.split(':').map(Number);

      // Compute shift end on the same calendar day as check-in
      const shiftEnd = new Date(record.checkInTime);
      shiftEnd.setHours(endHour, endMinute, 0, 0);

      // Safety: if shift end is before check-in (e.g. night shift edge case), skip
      if (shiftEnd <= record.checkInTime) {
        skipped++;
        log.warn({ recordId: record.id, trigger }, 'Skipped — shift end before check-in');
        continue;
      }

      // Only close if shift end has already passed (don't close today's active records)
      if (shiftEnd >= now) {
        skipped++;
        log.info({ recordId: record.id, trigger }, 'Skipped — shift not ended yet');
        continue;
      }

      const checkOutTime = shiftEnd;
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
            `Auto-closed by system (${trigger}) — employee did not clock out. ` +
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
          trigger,
        },
        'Record auto-closed'
      );
    } catch (err) {
      failed++;
      log.error({ err, recordId: record.id, trigger }, 'Failed to auto-close record');
    }
  }

  log.info({ closed, skipped, failed, trigger }, 'Auto-close job completed');
  return { closed, skipped, failed };
}

// Legacy alias — keeps existing imports working
export async function runMidnightAutoCloseJob(): Promise<void> {
  await runAutoClose('midnight-cron');
}

export function startMidnightAutoCloseJob(): void {
  // ── Startup catch-up ──────────────────────────────────────
  // Close any stale records immediately on boot.
  // Handles missed midnights from restarts, cold starts, local dev, etc.
  setTimeout(async () => {
    try {
      const result = await runAutoClose('startup');
      if (result.closed > 0) {
        log.info({ closed: result.closed }, 'Startup catch-up closed stale records');
      }
    } catch (err) {
      log.error({ err }, 'Startup catch-up failed');
      // Fire-and-forget alert; alerter never throws.
      alerter.send({
        source: 'midnight-autoclose-startup',
        title: 'Auto-close startup catch-up failed',
        severity: 'critical',
        error: err,
      });
    }
  }, 5000); // 5s delay — let DB connections stabilize

  // ── Midnight cron ─────────────────────────────────────────
  // '0 0 * * *' = midnight in server local time.
  // Requires TZ=Asia/Kathmandu in Railway environment variables.
  cron.schedule(
    '0 0 * * *',
    withJobAlerts('midnight-autoclose-job', runMidnightAutoCloseJob, { severity: 'critical' })
  );

  log.info(
    'Auto-close job initialized — startup catch-up in 5s, cron at 00:00 NPT'
  );
}