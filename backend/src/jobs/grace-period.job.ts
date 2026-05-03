// src/jobs/grace-period.job.ts
// ============================================================
// Runs daily at 8:30 AM Nepal time (UTC+5:45 = 02:45 UTC).
// Responsibilities:
//   - Sends a mid-grace reminder email to orgs in GRACE_PERIOD
//   - When grace period expires:
//       employees ≤ Starter threshold → downgrade to Starter (ACTIVE)
//       employees > threshold         → SUSPENDED
// ============================================================
import cron from 'node-cron';
import prisma from '../lib/prisma';
import { SubscriptionStatus } from '@prisma/client';
import { emailService } from '../services/email.service';
import { invalidatePlanCache } from '../services/plan.service';
import { createLogger } from '../logger';

const log = createLogger('grace-period-job');

// ── Main job function ────────────────────────────────────────

export async function runGracePeriodJob(): Promise<void> {
  log.info('Grace period job started');

  // ── Resolve the Starter plan once for use in downgrades ────
  const starterPlan = await prisma.pricingPlan.findFirst({
    where: { tier: 'STARTER', isActive: true },
    select: { id: true, maxEmployees: true, displayName: true },
  });

  if (!starterPlan) {
    log.error('Starter plan not found — grace period job cannot proceed');
    return;
  }

  const freeThreshold = starterPlan.maxEmployees ?? 5;

  // ── Find all GRACE_PERIOD subscriptions ────────────────────
  const graceSubs = await prisma.orgSubscription.findMany({
    where: { status: SubscriptionStatus.GRACE_PERIOD },
    include: {
      plan: {
        select: { displayName: true },
      },
      organization: {
        select: {
          id: true,
          name: true,
          email: true,
          // Admin lookup via OrgMembership (not User.users)
          memberships: {
            where: { role: 'ORG_ADMIN', isActive: true, leftAt: null },
            select: {
              user: { select: { email: true, firstName: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  const now = new Date();

  for (const sub of graceSubs) {
    try {
      const org        = sub.organization;
      const adminMembership = org.memberships[0];
      const adminEmail = adminMembership?.user.email ?? org.email;
      const adminName  = adminMembership?.user.firstName ?? 'there';

      // ── Send mid-grace reminder (once, when halfway through) ─
      if (!sub.gracePeriodReminderSentAt && sub.graceEndsAt) {
        const totalGraceMs = sub.graceEndsAt.getTime() - (sub.trialEndsAt?.getTime() ?? now.getTime());
        const halfwayAt    = new Date((sub.trialEndsAt?.getTime() ?? now.getTime()) + totalGraceMs / 2);

        if (now >= halfwayAt) {
          const daysLeft = Math.max(
            0,
            Math.ceil((sub.graceEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          );

          await emailService.sendTrialExpiredNotice({
            to: adminEmail,
            orgName: org.name,
            adminName,
          });

          await prisma.orgSubscription.update({
            where: { id: sub.id },
            data: { gracePeriodReminderSentAt: now },
          });

          log.info({ orgId: org.id, daysLeft }, 'Mid-grace reminder sent');
        }
      }

      // ── Grace period not yet expired — skip ──────────────────
      if (!sub.graceEndsAt || now < sub.graceEndsAt) continue;

      // ── Grace period expired — determine outcome ──────────────
      const employeeCount = sub.currentEmployeeCount;

      if (employeeCount <= freeThreshold) {
        // ── Downgrade to Starter ───────────────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.orgSubscription.update({
            where: { id: sub.id },
            data: {
              planId:                   starterPlan.id,
              status:                   SubscriptionStatus.ACTIVE,
              graceEndsAt:              null,
              gracePeriodReminderSentAt: null,
            },
          });

          await tx.subscriptionBillingLog.create({
            data: {
              subscriptionId: sub.id,
              organizationId: sub.organizationId,
              event: 'DOWNGRADED_TO_STARTER',
              note: `Grace period expired — auto-downgraded to ${starterPlan.displayName} (${employeeCount} employees ≤ free threshold of ${freeThreshold})`,
            },
          });
        });

        invalidatePlanCache(org.id);

        log.info(
          { orgId: org.id, orgName: org.name, employeeCount, freeThreshold },
          'Grace expired — downgraded to Starter'
        );

      } else {
        // ── Suspend ────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.orgSubscription.update({
            where: { id: sub.id },
            data: {
              status:                   SubscriptionStatus.SUSPENDED,
              suspendedAt:              now,
              graceEndsAt:              null,
              gracePeriodReminderSentAt: null,
            },
          });

          await tx.subscriptionBillingLog.create({
            data: {
              subscriptionId: sub.id,
              organizationId: sub.organizationId,
              event: 'SUSPENDED_GRACE_EXPIRED',
              note: `Grace period expired — subscription suspended (${employeeCount} employees > free threshold of ${freeThreshold}). Payment required to reactivate.`,
            },
          });
        });

        invalidatePlanCache(org.id);

        log.warn(
          { orgId: org.id, orgName: org.name, employeeCount, freeThreshold },
          'Grace expired — subscription suspended'
        );
      }

    } catch (err) {
      log.error({ err, subId: sub.id }, 'Error processing grace period subscription');
    }
  }

  log.info('Grace period job completed');
}

// ── Schedule ─────────────────────────────────────────────────

import { withJobAlerts } from './withJobAlerts';

export function startGracePeriodJob(): void {
  cron.schedule(
    '45 2 * * *',
    withJobAlerts('grace-period-job', runGracePeriodJob, { severity: 'critical' })
  );

  log.info('Grace period job scheduled — runs daily at 08:30 NPT');
}