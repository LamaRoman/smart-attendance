import { z } from 'zod';

export const scanPublicSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  employeeId: z.string().min(1, 'Employee ID is required').transform((v) => v.toUpperCase().trim()),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const mobileCheckinSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").transform((v) => v.toUpperCase().trim()),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type MobileCheckinInput = z.infer<typeof mobileCheckinSchema>;
export const scanAuthenticatedSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
});

export const manualAttendanceSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  action: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
  notes: z.string().max(500).optional(),
});

export const attendanceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.string().uuid().optional(),
  status: z.enum(['CHECKED_IN', 'CHECKED_OUT', 'AUTO_CLOSED']).optional(),
});

export const myAttendanceQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ScanPublicInput = z.infer<typeof scanPublicSchema>;
export type ScanAuthenticatedInput = z.infer<typeof scanAuthenticatedSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

// Edit attendance record (admin corrects time)
export const editAttendanceSchema = z.object({
  body: z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    note: z.string().min(3, 'Reason is required (min 3 characters)'),
    markPresent: z.boolean().optional(), // true = mark absent as present
  }),
});

export type EditAttendanceInput = z.infer<typeof editAttendanceSchema>['body'];
