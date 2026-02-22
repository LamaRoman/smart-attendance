import { z } from 'zod';

export const createLeaveSchema = z.object({
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  reason: z.string().min(1, 'Reason is required').max(500),
  type: z.enum(['SICK', 'CASUAL', 'ANNUAL', 'UNPAID', 'MATERNITY', 'PATERNITY']),
});

export const approveRejectLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionMessage: z.string().optional(),
});

export const leaveListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  userId: z.string().uuid().optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
