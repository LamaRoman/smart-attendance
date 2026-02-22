// src/middlewares/download.guard.ts
// ============================================================
// Specific guard for file downloads.
// Starter tier: preview mode — can SEE the file exists, cannot download.
// Operations tier: full download access.
//
// Usage:
//   router.get('/reports/:id/download', requireDownload('featureDownloadReports'), controller)
//   router.get('/payslips/:id/download', requireDownload('featureDownloadPayslips'), controller)
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { PricingPlan } from '@prisma/client';
import { getOrgPlan } from '../services/plan.service';

// ── Downloadable feature types ────────────────────────────────

type DownloadFeature =
  | 'featureDownloadReports'
  | 'featureDownloadPayslips'
  | 'featureDownloadAuditLog'
  | 'featureDownloadLeaveRecords';

const DOWNLOAD_LABELS: Record<DownloadFeature, string> = {
  featureDownloadReports:      'Attendance & payroll reports',
  featureDownloadPayslips:     'Payslips',
  featureDownloadAuditLog:     'Audit log exports',
  featureDownloadLeaveRecords: 'Leave records',
};

// ── Middleware factory ────────────────────────────────────────

/**
 * requireDownload
 * Blocks file download for Starter tier.
 * Returns a structured preview-mode response instead of a hard 403,
 * so the frontend can show a "upgrade to download" prompt rather
 * than a generic error.
 *
 * @example
 * router.get('/reports/:id/download', requireDownload('featureDownloadReports'), reportController.download)
 * router.get('/payslips/:id/download', requireDownload('featureDownloadPayslips'), payslipController.download)
 */
export function requireDownload(feature: DownloadFeature) {
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

      // Super admin always gets full download access
      if (user.role === 'SUPER_ADMIN') return next();

      if (!user.organizationId) {
        res.status(403).json({
          success: false,
          code: 'NO_ORGANIZATION',
          message: 'No organization found.',
        });
        return;
      }

      const plan = await getOrgPlan(user.organizationId);

      // No subscription
      if (!plan) {
        res.status(403).json({
          success: false,
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found.',
        });
        return;
      }

      // Subscription inactive
      if (!plan.isActive) {
        res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_INACTIVE',
          message: `Your subscription is ${plan.subscription.status.toLowerCase()}.`,
        });
        return;
      }

      // Master download flag off — preview only
      if (!plan.featureFileDownload) {
        const label = DOWNLOAD_LABELS[feature];
        res.status(403).json({
          success: false,
          code: 'PREVIEW_ONLY',
          // Not a generic error — tells the frontend exactly what to show
          previewOnly: true,
          message: `${label} can be previewed on your current plan. Upgrade to Operations to download.`,
          feature,
          currentPlan: plan.tier,
          upgradeRequired: true,
        });
        return;
      }

      // Granular flag off (e.g. featureDownloadAuditLog specifically disabled)
      if (!plan[feature as keyof PricingPlan]) {
        const label = DOWNLOAD_LABELS[feature];
        res.status(403).json({
          success: false,
          code: 'DOWNLOAD_NOT_AVAILABLE',
          message: `Downloading ${label} is not available on your current plan.`,
          feature,
          currentPlan: plan.tier,
          upgradeRequired: true,
        });
        return;
      }

      // All checks passed — proceed to download
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * attachDownloadCapability
 * Non-blocking middleware — attaches download capability info to res.locals
 * so controllers can conditionally include download URLs in API responses.
 * Use this on LIST endpoints where you want to show/hide download buttons.
 *
 * @example
 * router.get('/reports', attachDownloadCapability('featureDownloadReports'), reportController.list)
 *
 * Then in your controller:
 * const canDownload = res.locals.canDownload // true or false
 * // Include or exclude downloadUrl based on this
 */
export function attachDownloadCapability(feature: DownloadFeature) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      // Default to false — safe fallback
      res.locals.canDownload = false;

      if (!user || !user.organizationId) return next();
      if (user.role === 'SUPER_ADMIN') {
        res.locals.canDownload = true;
        return next();
      }

      const plan = await getOrgPlan(user.organizationId);

      if (plan?.isActive && plan.featureFileDownload && plan[feature as keyof PricingPlan]) {
        res.locals.canDownload = true;
      }

      next();
    } catch {
      // Never block a list request due to plan check failure
      res.locals.canDownload = false;
      next();
    }
  };
}