import { Router, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, userIdParamSchema } from '../schemas/user.schema';
import { authenticate, requireOrgAdmin, enforceOrgIsolation, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/users
router.get('/', requireOrgAdmin, enforceOrgIsolation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.listUsers(req.user!);
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
router.post('/', requireOrgAdmin, enforceOrgIsolation, validate(createUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.createUser(req.body, req.user!);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id
router.put('/:id', validate(userIdParamSchema, 'params'), validate(updateUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSelf = req.params.id === req.user!.userId;
    const isAdmin = req.user!.role === 'ORG_ADMIN' || req.user!.role === 'SUPER_ADMIN';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: { message: 'You can only update your own profile' } });
    }

    // Non-admins cannot change org-scoped fields
    if (!isAdmin) {
      delete req.body.role;
      delete req.body.isActive;
      delete req.body.shiftStartTime;
      delete req.body.shiftEndTime;
      delete req.body.panNumber;
    }

    const user = await userService.updateUser(req.params.id, req.body, req.user!);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id — removes employee from organization (membership deactivated, user intact)
router.delete('/:id', requireOrgAdmin, enforceOrgIsolation, validate(userIdParamSchema, 'params'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.removeFromOrganization(req.params.id, req.user!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/attendance-pin — admin resets an employee's PIN
router.patch('/:id/attendance-pin', requireOrgAdmin, enforceOrgIsolation, validate(userIdParamSchema, 'params'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.resetAttendancePin(req.params.id, req.user!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;