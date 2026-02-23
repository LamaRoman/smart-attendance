// src/services/plan.service.ts
// ============================================================
// Fetches and caches an org's active plan + feature flags.
// Everything in the app that needs to check features calls this.
// Uses in-memory cache with 5-min TTL â€” no Redis needed yet.
// ============================================================

import { PrismaClient, PricingPlan, OrgSubscription, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type OrgPlan = PricingPlan & {
  subscription: OrgSubscription;
  isActive: boolean;
  effectivePricePerEmployee: number; // Respects custom price overrides
};

// â”€â”€ In-memory cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  plan: OrgPlan | null;
  cachedAt: number;
}

const planCache = new Map<string, CacheEntry>();

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt < CACHE_TTL_MS;
}

/**
 * Active statuses â€” org can use the product
 * TRIALING and ACTIVE are both considered usable
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
];

// â”€â”€ Core function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * getOrgPlan
 * Fetches the org's current plan and subscription from DB.
 * Returns null if org has no subscription or is suspended/cancelled.
 * Caches result for 5 minutes per org.
 */
export async function getOrgPlan(organizationId: string): Promise<OrgPlan | null> {
  // Check cache first
  const cached = planCache.get(organizationId);
  if (cached && isCacheValid(cached)) {
    return cached.plan;
  }

  // Fetch from DB
  const subscription = await prisma.orgSubscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription) {
    planCache.set(organizationId, { plan: null, cachedAt: Date.now() });
    return null;
  }

  const isActive = ACTIVE_STATUSES.includes(subscription.status);

  // Build org plan with per-org feature overrides
  // null override = use plan default, true/false = force override
  const OVERRIDE_KEYS = [
'featureLeave', 'featureManualCorrection',
    'featureFullPayroll', 'featurePayrollWorkflow', 'featureReports',
    'featureNotifications', 'featureOnboarding', 'featureAuditLog',
    'featureFileDownload', 'featureDownloadReports', 'featureDownloadPayslips',
    'featureDownloadAuditLog', 'featureDownloadLeaveRecords',
  ] as const;

  const overrides: Record<string, boolean> = {};
  for (const key of OVERRIDE_KEYS) {
    const overrideKey = ('override' + key.charAt(0).toUpperCase() + key.slice(1)) as keyof typeof subscription;
    const overrideVal = subscription[overrideKey];
    if (typeof overrideVal === 'boolean') {
      overrides[key] = overrideVal;
    }
  }

  const orgPlan: OrgPlan = {
    ...subscription.plan,
    ...overrides,
    subscription,
    isActive,
    effectivePricePerEmployee:
      subscription.customPricePerEmployee !== null
        ? Number(subscription.customPricePerEmployee)
        : Number(subscription.plan.pricePerEmployee),
  };

  planCache.set(organizationId, { plan: orgPlan, cachedAt: Date.now() });
  return orgPlan;
}

/**
 * invalidatePlanCache
 * Call this whenever a subscription is updated by super admin
 * so the next request gets fresh data immediately.
 */
export function invalidatePlanCache(organizationId: string): void {
  planCache.delete(organizationId);
}

/**
 * hasFeature
 * Direct boolean check â€” use this inside service functions
 * when you need to branch logic rather than throw an error.
 *
 * @example
 * if (await hasFeature(orgId, 'featureFullPayroll')) {
 *   // include PF, CIT, Dashain bonus
 * }
 */
export async function hasFeature(
  organizationId: string,
  feature: keyof PricingPlan
): Promise<boolean> {
  const plan = await getOrgPlan(organizationId);
  if (!plan || !plan.isActive) return false;
  return Boolean(plan[feature]);
}

/**
 * assertFeature
 * Throws a structured error if the feature is not available.
 * Use this inside controllers/services when you want to throw
 * rather than branch.
 *
 * @example
 * await assertFeature(orgId, 'featureLeave', 'Leave management')
 */
export async function assertFeature(
  organizationId: string,
  feature: keyof PricingPlan,
  featureLabel: string
): Promise<void> {
  const plan = await getOrgPlan(organizationId);

  if (!plan) {
    throw new PlanError('NO_SUBSCRIPTION', 'No active subscription found for this organization.');
  }

  if (!plan.isActive) {
    throw new PlanError(
      'SUBSCRIPTION_INACTIVE',
      `Your subscription is ${plan.subscription.status.toLowerCase()}. Please contact support.`
    );
  }

  if (!plan[feature]) {
    throw new PlanError(
      'FEATURE_NOT_AVAILABLE',
      `${featureLabel} is not available on your current plan. Upgrade to Operations to access this feature.`
    );
  }
}

// â”€â”€ Error class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PlanErrorCode =
  | 'NO_SUBSCRIPTION'
  | 'SUBSCRIPTION_INACTIVE'
  | 'FEATURE_NOT_AVAILABLE'
  | 'DOWNLOAD_NOT_AVAILABLE'
  | 'EMPLOYEE_LIMIT_REACHED';

export class PlanError extends Error {
  public readonly code: PlanErrorCode;

  constructor(code: PlanErrorCode, message: string) {
    super(message);
    this.name = 'PlanError';
    this.code = code;
  }
}

