import { Router, Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { validate } from '../middleware/validate';
import {
  scanPublicSchema,
  scanAuthenticatedSchema,
  mobileCheckinSchema,
  manualAttendanceSchema,
  editAttendanceSchema,
  attendanceListQuerySchema,
  myAttendanceQuerySchema,
} from '../schemas/attendance.schema';
import { authenticate, requireOrgAdmin, enforceOrgIsolation, AuthRequest } from '../middleware/auth';
import { scanRateLimiter } from '../middleware/rateLimiter';
import { notificationService } from '../services/notification.service';
import prisma from '../lib/prisma';

const router = Router();

// POST /api/attendance/scan-public -- Unauthenticated, uses employee ID
router.post(
  '/scan-public',
  scanRateLimiter,
  validate(scanPublicSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.scanPublic(
        req.body,
        req.ip || undefined,
        req.get('user-agent') || undefined
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/attendance/org-mode/:orgId -- Public, returns attendance mode for the org
router.get("/org-mode/:orgId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId },
      select: { attendanceMode: true, geofenceEnabled: true },
    });
    if (!org) { res.status(404).json({ error: { message: "Organization not found" } }); return; }
    res.json({ data: { attendanceMode: org.attendanceMode, geofenceEnabled: org.geofenceEnabled } });
  } catch (error) { next(error); }
});

// GET /api/attendance/org-slug/:slug -- Public, resolves slug to org ID and mode
router.get("/org-slug/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug.toLowerCase() },
      select: { id: true, attendanceMode: true, geofenceEnabled: true },
    });
    if (!org) { res.status(404).json({ error: { message: "Organization not found" } }); return; }
    res.json({ data: org });
  } catch (error) { next(error); }
});
// POST /api/attendance/mobile-checkin -- Unauthenticated, GPS-based
router.post(
  "/mobile-checkin",
  scanRateLimiter,
  validate(mobileCheckinSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.mobileCheckin(
        req.body,
        req.ip || undefined,
        req.get("user-agent") || undefined
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);
// POST /api/attendance/scan -- Authenticated QR scan
router.post(
  '/scan',
  authenticate,
  validate(scanAuthenticatedSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.scanAuthenticated(
        req.body,
        req.user!,
        req.ip || undefined,
        req.get('user-agent') || undefined
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/attendance/status -- Current clock-in status
router.get('/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await attendanceService.getStatus(req.user!.userId);
    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

// GET /api/attendance/my -- My attendance records
router.get(
  '/my',
  authenticate,
  validate(myAttendanceQuerySchema, 'query'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = req.query as any;
      const result = await attendanceService.getMyAttendance(req.user!.userId, limit, offset);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/attendance -- Admin list (org-scoped)
router.get(
  '/',
  authenticate,
  requireOrgAdmin,
  enforceOrgIsolation,
  validate(attendanceListQuerySchema, 'query'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { limit, offset, userId, status } = req.query as any;
      const result = await attendanceService.listAttendance(req.user!, limit, offset, { userId, status });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/attendance/manual -- Admin manual clock in/out
router.post(
  '/manual',
  authenticate,
  requireOrgAdmin,
  enforceOrgIsolation,
  validate(manualAttendanceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.manualAttendance(req.body, req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/attendance/:id/edit -- Admin edits attendance record
router.put(
  '/:id/edit',
  authenticate,
  requireOrgAdmin,
  enforceOrgIsolation,
  validate(editAttendanceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.editAttendance(req.params.id, req.body, req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/attendance/mark-present -- Admin marks absent employee as present
router.post(
  '/mark-present',
  authenticate,
  requireOrgAdmin,
  enforceOrgIsolation,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await attendanceService.markPresent(req.body, req.user!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/attendance/late-arrivals - Get late arrivals with filters and statistics
router.get('/late-arrivals', authenticate, requireOrgAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(400).json({ error: { message: 'No organization associated' } });
    }

    // Get query parameters for filtering
    const { range = 'today', fromDate, toDate } = req.query;

    // Get organization's work start time and threshold
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { 
        workStartTime: true,
        lateThresholdMinutes: true,
      },
    });

    if (!org || !org.workStartTime) {
      return res.json({ data: { records: [], stats: null } });
    }

    // Calculate date range based on filter
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'custom':
        if (fromDate && toDate) {
          startDate = new Date(fromDate as string);
          endDate = new Date(toDate as string);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Default to today if custom dates not provided
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        break;
      
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
    }

    // Fetch attendance records in date range
    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkInTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        checkInTime: 'desc',
      },
    });

    // Filter for late arrivals and calculate minutes late
    const [workHour, workMinute] = org.workStartTime.split(':').map(Number);
    const threshold = org.lateThresholdMinutes || 10;
    
    const lateArrivals = records
      .map((record) => {
        const checkIn = new Date(record.checkInTime!);
        const workStart = new Date(checkIn);
        workStart.setHours(workHour, workMinute, 0, 0);

        const diffMs = checkIn.getTime() - workStart.getTime();
        const minutesLate = Math.floor(diffMs / 60000);

        if (minutesLate > threshold) {
          return {
            id: record.id,
            userId: record.user.id,
            userName: `${record.user.firstName} ${record.user.lastName}`,
            employeeId: record.user.employeeId,
            date: record.checkInTime,
            checkInTime: record.checkInTime,
            minutesLate,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Calculate statistics
    const stats = {
      totalLateArrivals: lateArrivals.length,
      averageMinutesLate: lateArrivals.length > 0 
        ? Math.round(lateArrivals.reduce((sum: number, r: any) => sum + r.minutesLate, 0) / lateArrivals.length)
        : 0,
      repeatOffenders: Object.entries(
        lateArrivals.reduce((acc: any, r: any) => {
          acc[r.userId] = acc[r.userId] || { 
            userName: r.userName, 
            employeeId: r.employeeId,
            count: 0,
            totalMinutesLate: 0 
          };
          acc[r.userId].count++;
          acc[r.userId].totalMinutesLate += r.minutesLate;
          return acc;
        }, {})
      )
        .map(([userId, data]: any) => ({
          userId,
          userName: data.userName,
          employeeId: data.employeeId,
          lateCount: data.count,
          averageMinutesLate: Math.round(data.totalMinutesLate / data.count),
        }))
        .sort((a: any, b: any) => b.lateCount - a.lateCount)
        .slice(0, 5), // Top 5 repeat offenders
    };

    res.json({ data: { records: lateArrivals, stats } });
  } catch (error) {
    next(error);
  }
});

export default router;

