import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/auth.schema';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

// POST /api/auth/login
router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await authService.logout(token);
    }
    res.clearCookie('token', { path: '/' });
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/attendance-pin - self-service PIN change
router.patch('/attendance-pin', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !/^\d{4}$/.test(currentPin)) {
      res.status(400).json({ error: { message: 'Current PIN must be 4 digits', code: 'VALIDATION_ERROR' } }); return;
    }
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      res.status(400).json({ error: { message: 'New PIN must be 4 digits', code: 'VALIDATION_ERROR' } }); return;
    }
    if (currentPin === newPin) {
      res.status(400).json({ error: { message: 'New PIN must be different from current PIN', code: 'VALIDATION_ERROR' } }); return;
    }
    const result = await authService.changeAttendancePin(req.user!.userId, currentPin, newPin);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
export default router;
