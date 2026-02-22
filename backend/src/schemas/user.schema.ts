import { z } from 'zod';

const timeField = z
  .string()
  .transform((v) => (v === '' ? undefined : v))
  .pipe(
    z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional()
  )
  .nullable()
  .optional();

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  shiftStartTime: timeField,
  shiftEndTime: timeField,
  role: z.enum(['ORG_ADMIN', 'EMPLOYEE'], { errorMap: () => ({ message: 'Role must be ORG_ADMIN or EMPLOYEE' }) }).default('EMPLOYEE'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').transform((v) => v.toLowerCase().trim()).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .optional(),
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  phone: z.string().optional(),
  shiftStartTime: timeField,
  shiftEndTime: timeField,
  role: z.enum(['ORG_ADMIN', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;