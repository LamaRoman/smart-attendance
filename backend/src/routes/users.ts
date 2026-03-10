import { Router, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, userIdParamSchema, addExistingUserSchema } from '../schemas/user.schema';
import { authenticate, requireOrgAdmin, enforceOrgIsolation, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

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

// GET /api/users/upcoming-birthdays?days=30
router.get('/upcoming-birthdays', requireOrgAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    if (!organizationId) return res.json([]);

    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const memberships = await prisma.orgMembership.findMany({
      where: {
        organizationId,
        isActive: true,
        leftAt: null,
        deletedAt: null,
        user: { dateOfBirth: { not: null } },
      },
      select: {
        employeeId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = memberships
      .map((m) => {
        const dob = m.user.dateOfBirth!;
        // Next birthday this year or next
        let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          employeeId: m.employeeId,
          dateOfBirth: m.user.dateOfBirth,
          daysUntil,
          isToday: daysUntil === 0,
        };
      })
      .filter((e) => e.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json(upcoming);
  } catch (error) {
    next(error);
  }
});

// POST /api/users — Create brand new user + membership
router.post('/', requireOrgAdmin, enforceOrgIsolation, validate(createUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.createUser(req.body, req.user!);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/add-existing — Add existing platform user by Platform ID
router.post('/add-existing', requireOrgAdmin, enforceOrgIsolation, validate(addExistingUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.addExistingUserByPlatformId(req.body, req.user!);
    res.status(201).json({ data: result });
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

// PATCH /api/users/:id/status
router.patch('/:id/status', requireOrgAdmin, enforceOrgIsolation, validate(userIdParamSchema, 'params'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateUser(req.params.id, { isActive: req.body.isActive }, req.user!);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

export default router;