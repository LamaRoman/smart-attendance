// src/services/superadmin.subscription.service.ts
import prisma from '../lib/prisma';
import { SubscriptionStatus, TierName, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { invalidatePlanCache } from './plan.service';
import { JWTPayload } from '../lib/jwt';

const log = createLogger('superadmin-subscription-service');

export class SuperAdminSubscriptionService {

  // ── List all org subscriptions ──
  async listSubscriptions(query: {
    page?: number;
    limit?: number;
    status?: SubscriptionStatus;
    tier?: TierName;
    search?: string;
  }) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.OrgSubscriptionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.tier)   where.plan   = { tier: query.tier };
    if (query.search) {
      where.organization = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.orgSubscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: { id: true, name: true, email: true },
          },
          plan: {
            select: {
              tier: true,
              displayName: true,
              pricePerEmployee: true,
              maxEmployees: true,
              featureTotp: true,
              featureLeave: true,
              featureManualCorrection: true,
              featureFullPayroll: true,
              featurePayrollWorkflow: true,
              featureReports: true,
              featureNotifications: true,
              featureOnboarding: true,
              featureAuditLog: true,
              featureFileDownload: true,
              featureDownloadReports: true,
              featureDownloadPayslips: true,
              featureDownloadAuditLog: true,
              featureDownloadLeaveRecords: true,
            },
          },
          adminNotes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orgSubscription.count({ where }),
    ]);

    // Count employees/admins per org via OrgMembership (not User)
    const orgIds = subscriptions.map(s => s.organizationId);
    const membershipCounts = await prisma.orgMembership.groupBy({
      by: ['organizationId', 'role'],
      where: {
        organizationId: { in: orgIds },
        isActive: true,
        leftAt: null,
        role: { in: ['EMPLOYEE', 'ORG_ADMIN'] },
      },
      _count: { id: true },
    });

    const countMap: Record<string, { employeeCount: number; adminCount: number }> = {};
    for (const row of membershipCounts) {
      if (!countMap[row.organizationId]) {
        countMap[row.organizationId] = { employeeCount: 0, adminCount: 0 };
      }
      if (row.role === 'EMPLOYEE') countMap[row.organizationId].employeeCount = row._count.id;
      if (row.role === 'ORG_ADMIN') countMap[row.organizationId].adminCount = row._count.id;
    }

    const enriched = subscriptions.map(sub => ({
      ...sub,
      employeeCount: countMap[sub.organizationId]?.employeeCount ?? 0,
      adminCount:    countMap[sub.organizationId]?.adminCount    ?? 0,
    }));

    return {
      subscriptions: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ── Get single org subscription ──
  async getSubscription(organizationId: string) {
    const subscription = await prisma.orgSubscription.findUnique({
      where: { organizationId },
      include: {
        organization: { select: { id: true, name: true, email: true } },
        plan: true,
        adminNotes: { orderBy: { createdAt: 'desc' } },
        billingHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!subscription) throw new NotFoundError('No subscription found for this organization');
    return subscription;
  }

  // ── Assign / change tier ──
  async assignTier(
    organizationId: string,
    input: { tier: TierName; note?: string; forceTrial?: boolean; billingCycle?: string },
    currentUser: JWTPayload
  ) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organization not found');

    const plan = await prisma.pricingPlan.findFirst({
      where: { tier: input.tier, isActive: true },
    });
    if (!plan) throw new NotFoundError(`No active plan found for tier: ${input.tier}`);

    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    const now = new Date();

    const canUseTrial = (input.forceTrial === true) || (plan.trialDaysMonthly > 0 && !(existing?.isTrialUsed ?? false));

    const trialEndsAt = canUseTrial
      ? new Date(now.getTime() + plan.trialDaysMonthly * 24 * 60 * 60 * 1000)
      : null;

    const status: SubscriptionStatus = canUseTrial
      ? SubscriptionStatus.TRIALING
      : SubscriptionStatus.ACTIVE;

    if (!canUseTrial && plan.trialDaysMonthly > 0 && existing?.isTrialUsed) {
      log.info({ organizationId }, 'Trial skipped -- org has already used their free trial');
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = existing
        ? await tx.orgSubscription.update({
            where: { organizationId },
            data: {
              planId:                   plan.id,
              status,
              billingCycle:             (input.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as any,
              trialStartedAt:           canUseTrial ? now : null,
              trialEndsAt,
              isTrialUsed:              canUseTrial ? true : existing.isTrialUsed,
              graceEndsAt:              null,
              gracePeriodReminderSentAt: null,
              suspendedAt:              null,
              currentPeriodStart:       canUseTrial ? null : now,
              currentPeriodEnd:         canUseTrial ? null : new Date(now.getTime() + (input.billingCycle === 'ANNUAL' ? 365 : 30) * 24 * 60 * 60 * 1000),
              assignedBy:               currentUser.userId,
              assignedAt:               now,
            },
          })
        : await tx.orgSubscription.create({
            data: {
              organizationId,
              planId:         plan.id,
              status,
              billingCycle:   (input.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as any,
              trialStartedAt: canUseTrial ? now : null,
              trialEndsAt,
              isTrialUsed:    canUseTrial,
              currentPeriodStart: canUseTrial ? null : now,
              currentPeriodEnd:   canUseTrial ? null : new Date(now.getTime() + (input.billingCycle === 'ANNUAL' ? 365 : 30) * 24 * 60 * 60 * 1000),
              assignedBy:     currentUser.userId,
              assignedAt:     now,
            },
          });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       existing ? 'PLAN_CHANGED' : 'PLAN_ASSIGNED',
          note:        input.note ?? `Tier set to ${input.tier} by super admin${canUseTrial ? ' -- trial started' : ' -- no trial (already used)'}`,
          performedBy: currentUser.userId,
        },
      });

      if (input.note) {
        await tx.subscriptionAdminNote.create({
          data: { subscriptionId: sub.id, note: input.note, createdBy: currentUser.userId },
        });
      }

      return sub;
    });

    invalidatePlanCache(organizationId);
    log.info({ organizationId, tier: input.tier, canUseTrial }, 'Tier assigned by super admin');
    return subscription;
  }

  // ── Override pricing ──
  async overridePricing(
    organizationId: string,
    input: {
      customPricePerEmployee: number | null;
      customMaxEmployees?: number | null;
      isPriceLockedForever?: boolean;
      customPriceExpiresAt?: string | null;
      note?: string;
    },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data: {
          customPricePerEmployee: input.customPricePerEmployee,
          customMaxEmployees:     input.customMaxEmployees ?? existing.customMaxEmployees,
          isPriceLockedForever:   input.isPriceLockedForever ?? existing.isPriceLockedForever,
          customPriceExpiresAt:   input.customPriceExpiresAt
            ? new Date(input.customPriceExpiresAt)
            : input.customPricePerEmployee === null
            ? null
            : existing.customPriceExpiresAt,
        },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'PRICE_OVERRIDDEN',
          note:        input.note ?? `Custom price set to ${input.customPricePerEmployee ?? 'standard'} by super admin`,
          performedBy: currentUser.userId,
        },
      });

      if (input.note) {
        await tx.subscriptionAdminNote.create({
          data: { subscriptionId: sub.id, note: input.note, createdBy: currentUser.userId },
        });
      }

      return sub;
    });

    invalidatePlanCache(organizationId);
    return subscription;
  }

  // ── Waive setup fee ──
  async waiveSetupFee(
    organizationId: string,
    input: { reason: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data: {
          setupFeeWaived:     true,
          setupFeeWaivedNote: input.reason,
          setupFeeWaivedBy:   currentUser.userId,
        },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'SETUP_FEE_WAIVED',
          note:        input.reason,
          performedBy: currentUser.userId,
        },
      });

      return sub;
    });

    invalidatePlanCache(organizationId);
    return subscription;
  }

  // ── Suspend ──
  async suspendSubscription(
    organizationId: string,
    input: { reason: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');
    if (existing.status === SubscriptionStatus.SUSPENDED) {
      throw new ConflictError('Subscription is already suspended');
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.SUSPENDED, suspendedAt: new Date() },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'SUSPENDED',
          note:        input.reason,
          performedBy: currentUser.userId,
        },
      });

      await tx.subscriptionAdminNote.create({
        data: {
          subscriptionId: sub.id,
          note:      `SUSPENDED: ${input.reason}`,
          createdBy: currentUser.userId,
        },
      });

      return sub;
    });

    invalidatePlanCache(organizationId);
    log.warn({ organizationId }, 'Subscription suspended by super admin');
    return subscription;
  }

  // ── Mark as Expired (manual) ──
  async markAsExpired(
    organizationId: string,
    input: { reason: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');
    if (existing.status !== SubscriptionStatus.SUSPENDED) {
      throw new ConflictError(
        `Only SUSPENDED subscriptions can be manually marked as expired. Current status: ${existing.status}`
      );
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data:  { status: SubscriptionStatus.EXPIRED },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'EXPIRED_MANUAL',
          note:        input.reason,
          performedBy: currentUser.userId,
        },
      });

      await tx.subscriptionAdminNote.create({
        data: {
          subscriptionId: sub.id,
          note:      `EXPIRED (manual): ${input.reason}`,
          createdBy: currentUser.userId,
        },
      });

      return sub;
    });

    invalidatePlanCache(organizationId);
    log.warn({ organizationId, reason: input.reason }, 'Subscription manually marked as EXPIRED by super admin');
    return subscription;
  }

  // ── Extend Trial ──
  async extendTrial(
    organizationId: string,
    input: { days: number; note?: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');

    if (!['TRIALING', 'GRACE_PERIOD'].includes(existing.status)) {
      throw new ConflictError(
        `Trial can only be extended for TRIALING or GRACE_PERIOD subscriptions. Current status: ${existing.status}`
      );
    }

    const now = new Date();
    const baseDate = existing.trialEndsAt && existing.trialEndsAt > now
      ? existing.trialEndsAt
      : now;
    const newTrialEndsAt = new Date(baseDate.getTime() + input.days * 24 * 60 * 60 * 1000);

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data: {
          status:                    SubscriptionStatus.TRIALING,
          trialEndsAt:               newTrialEndsAt,
          graceEndsAt:               null,
          gracePeriodReminderSentAt: null,
          trialReminderSentAt:       null,
          trialFinalReminderAt:      null,
        },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'TRIAL_EXTENDED',
          note:        input.note ?? `Trial extended by ${input.days} days -- new end: ${newTrialEndsAt.toISOString().split('T')[0]}`,
          performedBy: currentUser.userId,
        },
      });

      return sub;
    });

    invalidatePlanCache(organizationId);
    log.info({ organizationId, days: input.days, newTrialEndsAt }, 'Trial extended by super admin');
    return subscription;
  }

  // ── Reactivate ──
  async reactivateSubscription(
    organizationId: string,
    input: { note?: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');
    if (existing.status === SubscriptionStatus.ACTIVE) {
      throw new ConflictError('Subscription is already active');
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.orgSubscription.update({
        where: { organizationId },
        data: {
          status:                   SubscriptionStatus.ACTIVE,
          suspendedAt:              null,
          graceEndsAt:              null,
          gracePeriodReminderSentAt: null,
        },
      });

      await tx.subscriptionBillingLog.create({
        data: {
          subscriptionId: sub.id,
          organizationId,
          event:       'REACTIVATED',
          note:        input.note ?? 'Reactivated by super admin',
          performedBy: currentUser.userId,
        },
      });

      return sub;
    });

    invalidatePlanCache(organizationId);
    return subscription;
  }

  // ── Add admin note ──
  async addNote(
    organizationId: string,
    input: { note: string },
    currentUser: JWTPayload
  ) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');

    return prisma.subscriptionAdminNote.create({
      data: {
        subscriptionId: existing.id,
        note:           input.note,
        createdBy:      currentUser.userId,
      },
    });
  }

  // ── Get billing log ──
  async getBillingLog(organizationId: string) {
    const existing = await prisma.orgSubscription.findUnique({ where: { organizationId } });
    if (!existing) throw new NotFoundError('No subscription found for this organization');

    return prisma.subscriptionBillingLog.findMany({
      where:   { subscriptionId: existing.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const superAdminSubscriptionService = new SuperAdminSubscriptionService();