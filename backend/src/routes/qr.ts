import { Router, Request, Response, NextFunction } from 'express';
import { qrService } from '../services/qr.service';
import { authenticate, requireOrgAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/qr/generate — Generate rotating QR (24h expiry)
router.post(
  '/generate',
  requireOrgAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await qrService.generate(req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/qr/generate-static — Generate static QR (no expiry, printable)
router.post(
  '/generate-static',
  requireOrgAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await qrService.generateStatic(req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/qr/regenerate-static — Revoke old static QR and generate new one
router.post(
  '/regenerate-static',
  requireOrgAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await qrService.regenerateStatic(req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/qr/active — Get current active QR code
// FIX C-06: Added requireOrgAdmin guard. Previously any authenticated employee
// could call this endpoint and retrieve the full QR token + signature,
// which is the first step in the ghost attendance attack chain.
router.get(
  '/active',
  requireOrgAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await qrService.getActive(req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/qr/revoke — Revoke all active QR codes
router.post(
  '/revoke',
  requireOrgAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await qrService.revoke(req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
