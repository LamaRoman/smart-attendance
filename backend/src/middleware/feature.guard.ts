// src/middlewares/feature.guard.ts
// ============================================================
// Express middleware factory for feature gating.
// Drop onto any route that requires a paid feature.
//
// Usage:
//   router.get('/leaves', requireFeature('featureLeave'), controller)
//   router.post('/payroll', requireFeature('featureFullPayroll'), controller)
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { PricingPlan } from '@prisma/client';
import { getOrgPlan, PlanError } from '../services/plan.service';

// â”€â”€ Assumes your auth middleware sets req.user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Adjust the type to match your actual User type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string | null;
        role: string;
      };
    }
  }
}

// â”€â”€ Feature labels â€” shown in error messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FEATURE_LABELS: Partial<Record<keyof PricingPlan, string>> = {
  featureLeave:            'Leave management',
  featureManualCorrection: 'Manual attendance correction',
  featureFullPayroll:      'Full payroll processing',
  featurePayrollWorkflow:  'Payroll approval workflow',
  featureReports:          'Reports & data exports',
  featureNotifications:    'Notifications & alerts',
  featureOnboarding:       'Dedicated onboarding',
  featureAuditLog:         'Attendance audit log',
  featureFileDownload:     'File downloads',
};

// â”€â”€ Middleware factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * requireFeature
 * Returns an Express middleware that blocks the request if the
 * org's current plan does not have the given feature enabled.
 *
 * SUPER_ADMIN bypasses all feature checks â€” they have full access.
 *
 * @example
 * router.get('/leaves', requireFeature('featureLeave'), leaveController.getAll)
 */
export function requireFeature(feature: keyof PricingPlan) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        });
        return;
      }

      // Super admin bypasses all plan checks
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }

      if (!user.organizationId) {
        res.status(403).json({ error: {
          success: false,
          code: 'NO_ORGANIZATION',
          message: 'User is not associated with any organization.',
        }});
        return;
      }

      const plan = await getOrgPlan(user.organizationId);

      // No subscription at all
      if (!plan) {
        res.status(403).json({ error: {
          success: false,
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found. Please contact your administrator.',
        }});
        return;
      }

      // Subscription exists but is inactive (suspended, cancelled, expired)
      if (!plan.isActive) {
        res.status(403).json({ error: {
          success: false,
          code: 'SUBSCRIPTION_INACTIVE',
          message: `Your subscription is ${plan.subscription.status.toLowerCase()}. Please contact support.`,
          status: plan.subscription.status,
        }});
        return;
      }

      // Feature not available on current plan
      if (!plan[feature]) {
        const label = FEATURE_LABELS[feature] ?? feature;
        res.status(403).json({ error: {
          success: false,
          code: 'FEATURE_NOT_AVAILABLE',
          message: `${label} is not available on your current plan.`,
          feature,
          currentPlan: plan.tier,
          upgradeRequired: true,
        }});
        return;
      }

      // All checks passed
      next();
    } catch (error) {
      if (error instanceof PlanError) {
        res.status(403).json({ error: {
          success: false,
          code: error.code,
          message: error.message,
        }});
        return;
      }
      next(error);
    }
  };
}

/**
 * requireActivePlan
 * Lighter check â€” just verifies the org has an active subscription.
 * Use on routes that don't gate a specific feature but still
 * require a paid/trialing status (e.g. dashboard, profile).
 *
 * @example
 * router.get('/dashboard', requireActivePlan, dashboardController.get)
 */
export async function requireActivePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;

    if (!user || user.role === 'SUPER_ADMIN') return next();

    if (!user.organizationId) {
      res.status(403).json({ error: { success: false, code: 'NO_ORGANIZATION', message: 'No organization found.' } });
      return;
    }

    const plan = await getOrgPlan(user.organizationId);

    if (!plan || !plan.isActive) {
      res.status(403).json({ error: {
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'Your subscription is inactive. Please contact support.',
      }});
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
