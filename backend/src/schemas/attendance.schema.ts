import { z } from 'zod';

// ============================================================
// QR Scan — Public (unauthenticated, employeeId + PIN)
// ============================================================
export const scanPublicSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .transform((v) => v.toUpperCase().trim()),
  pin: z
    .string()
    .length(4, 'PIN must be 4 digits')
    .regex(/^\d{4}$/, 'PIN must be 4 digits'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().min(0).max(10000).optional(),
});
export type ScanPublicInput = z.infer<typeof scanPublicSchema>;

// ============================================================
// Mobile Check-in — Public (unauthenticated, GPS + PIN)
// ============================================================
export const mobileCheckinSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .transform((v) => v.toUpperCase().trim()),
  pin: z
    .string()
    .length(4, 'PIN must be 4 digits')
    .regex(/^\d{4}$/, 'PIN must be 4 digits'),
  organizationId: z.string().uuid('Invalid organization ID'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(10000).optional(),
});
export type MobileCheckinInput = z.infer<typeof mobileCheckinSchema>;

// ============================================================
// QR Scan — Authenticated (logged-in user scans QR)
// ============================================================
export const scanAuthenticatedSchema = z.object({
  qrPayload: z.string().min(1, 'QR payload is required'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().min(0).max(10000).optional(),
});
export type ScanAuthenticatedInput = z.infer<typeof scanAuthenticatedSchema>;

// ============================================================
// Manual Attendance — Admin clock-in/out on behalf of employee
// ============================================================
export const manualAttendanceSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  action: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
  notes: z.string().max(500).optional(),
});
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

// ============================================================
// Edit Attendance — Admin corrects check-in/out times
// ============================================================
export const editAttendanceSchema = z.object({
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  note: z.string().min(3, 'Reason is required (min 3 characters)'),
  markPresent: z.boolean().optional(),
});
export type EditAttendanceInput = z.infer<typeof editAttendanceSchema>;

// ============================================================
// Query schemas — used with validate(schema, 'query')
// ============================================================
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