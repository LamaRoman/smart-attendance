import { Router, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, userIdParamSchema } from '../schemas/user.schema';
import { authenticate, requireOrgAdmin, enforceOrgIsolation, AuthRequest } from '../middleware/auth';

const router = Router();

// All user routes require auth + org admin
router.use(authenticate, requireOrgAdmin, enforceOrgIsolation);

// GET /api/users
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.listUsers(req.user!);
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
router.post('/', validate(createUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    const user = await userService.updateUser(req.params.id, req.body, req.user!);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
router.delete('/:id', validate(userIdParamSchema, 'params'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});


// PATCH /api/users/:id/attendance-pin
router.patch('/:id/attendance-pin', validate(userIdParamSchema, 'params'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      res.status(400).json({ error: { message: 'PIN must be exactly 4 digits' } });
      return;
    }
    const result = await userService.setAttendancePin(req.params.id, pin, req.user!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;

