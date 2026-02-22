import prisma from '../lib/prisma';
import { parseQRPayload, verifyQRSignature, verifyTOTPCode } from '../lib/crypto';
import { adToBS } from '../lib/nepali-date';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';
import {
  ScanPublicInput,
  ScanAuthenticatedInput,
  ManualAttendanceInput,
} from '../schemas/attendance.schema';
import { notificationService } from './notification.service';

const log = createLogger('attendance-service');

const SCAN_COOLDOWN_MINUTES = 2;
const MAX_DAILY_SCANS = 4;

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c2 = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c2;
}

export class AttendanceService {
  /**
   * Public QR scan — uses employee ID instead of auth
   */
  async scanPublic(input: ScanPublicInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { employeeId: input.employeeId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, isActive: true, organizationId: true },
    });

    if (!user) {
      await this.logAudit({ employeeId: input.employeeId, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'EMPLOYEE_NOT_FOUND', ipAddress, userAgent });
      throw new NotFoundError('Employee ID not found');
    }

    if (!user.isActive) {
      await this.logAudit({ employeeId: input.employeeId, userId: user.id, organizationId: user.organizationId!, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'ACCOUNT_INACTIVE', ipAddress, userAgent });
      throw new ValidationError('Account is inactive');
    }

    await this.validateQRPayload(input.qrPayload, user.organizationId!);

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: { geofenceEnabled: true, officeLat: true, officeLng: true, geofenceRadius: true },
    });
    if (org?.geofenceEnabled && org.officeLat && org.officeLng) {
      if (!input.latitude || !input.longitude) {
        throw new ValidationError('Location is required. Please enable GPS on your device.');
      }
      const distance = calculateDistance(input.latitude, input.longitude, org.officeLat, org.officeLng);
      if (distance > (org.geofenceRadius || 100)) {
        await this.logAudit({ employeeId: input.employeeId, userId: user.id, organizationId: user.organizationId!, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'OUTSIDE_GEOFENCE', ipAddress, userAgent });
        throw new ValidationError('You are ' + Math.round(distance) + 'm from office. Must be within ' + org.geofenceRadius + 'm.');
      }
    }

    await this.checkCooldown(user.id);
    await this.checkDailyLimit(user.id);

    const result = await this.performClockAction(user.id, user.organizationId!, 'QR_SCAN');

    await this.logAudit({
      employeeId: input.employeeId,
      userId: user.id,
      organizationId: user.organizationId!,
      action: result.action,
      method: 'QR_SCAN',
      success: true,
      ipAddress,
      userAgent,
    });

    const userName = `${user.firstName} ${user.lastName}`;
    const message = result.action === 'CLOCK_IN'
      ? `${userName} clocked in at ${result.record.checkInTime.toLocaleTimeString()}`
      : `${userName} clocked out. Duration: ${result.record.duration} minutes`;

    return { ...result, message, user: { firstName: user.firstName, lastName: user.lastName, employeeId: user.employeeId } };
  }

  /**
   * Authenticated QR scan
   */

  async mobileCheckin(input: { employeeId: string; latitude: number; longitude: number }, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { employeeId: input.employeeId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, isActive: true, organizationId: true },
    });
    if (!user) {
      await this.logAudit({ employeeId: input.employeeId, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'EMPLOYEE_NOT_FOUND', ipAddress, userAgent });
      throw new NotFoundError('Employee ID not found');
    }
    if (!user.isActive) {
      await this.logAudit({ employeeId: input.employeeId, userId: user.id, organizationId: user.organizationId!, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'ACCOUNT_INACTIVE', ipAddress, userAgent });
      throw new ValidationError('Account is inactive');
    }
    // Check org allows mobile check-in
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: { attendanceMode: true, geofenceEnabled: true, officeLat: true, officeLng: true, geofenceRadius: true },
    });
    if (!org) throw new NotFoundError('Organization not found');
    if (org.attendanceMode === 'QR_ONLY') {
      throw new ValidationError('Mobile check-in is not enabled for this organization. Please use QR scan.');
    }
    // Geofence is mandatory for mobile check-in
    if (!org.geofenceEnabled || !org.officeLat || !org.officeLng) {
      throw new ValidationError('Geofencing must be enabled for mobile check-in. Contact your administrator.');
    }
    const distance = calculateDistance(input.latitude, input.longitude, org.officeLat, org.officeLng);
    if (distance > (org.geofenceRadius || 100)) {
      await this.logAudit({ employeeId: input.employeeId, userId: user.id, organizationId: user.organizationId!, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'OUTSIDE_GEOFENCE', ipAddress, userAgent });
      throw new ValidationError('You are ' + Math.round(distance) + 'm from office. Must be within ' + org.geofenceRadius + 'm.');
    }
    await this.checkCooldown(user.id);
    await this.checkDailyLimit(user.id);
    const result = await this.performClockAction(user.id, user.organizationId!, 'MOBILE_CHECKIN');
    await this.logAudit({
      employeeId: input.employeeId,
      userId: user.id,
      organizationId: user.organizationId!,
      action: result.action,
      method: 'MOBILE_CHECKIN',
      success: true,
      ipAddress,
      userAgent,
    });
    const userName = user.firstName + ' ' + user.lastName;
    const message = result.action === 'CLOCK_IN'
      ? userName + ' clocked in at ' + result.record.checkInTime.toLocaleTimeString()
      : userName + ' clocked out. Duration: ' + result.record.duration + ' minutes';
    return { ...result, message, user: { firstName: user.firstName, lastName: user.lastName, employeeId: user.employeeId } };
  }

  async scanAuthenticated(input: ScanAuthenticatedInput, currentUser: JWTPayload, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, organizationId: true },
    });

    if (!user || !user.organizationId) {
      throw new NotFoundError('User not found');
    }

    await this.validateQRPayload(input.qrPayload, user.organizationId);
    await this.checkCooldown(user.id);
    await this.checkDailyLimit(user.id);

    const result = await this.performClockAction(user.id, user.organizationId, 'QR_SCAN');

    await this.logAudit({
      userId: user.id,
      organizationId: user.organizationId,
      action: result.action,
      method: 'QR_SCAN',
      success: true,
      ipAddress,
      userAgent,
    });

    const message = result.action === 'CLOCK_IN'
      ? `Clocked in at ${result.record.checkInTime.toLocaleTimeString()}`
      : `Clocked out. Duration: ${result.record.duration} minutes`;

    return { ...result, message };
  }

  /**
   * Manual clock in/out by admin
   */
  async manualAttendance(input: ManualAttendanceInput, currentUser: JWTPayload) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, firstName: true, lastName: true, employeeId: true, organizationId: true },
    });

    if (!user) throw new NotFoundError('User not found');

    if (currentUser.role !== 'SUPER_ADMIN' && user.organizationId !== currentUser.organizationId) {
      throw new NotFoundError('User not found');
    }

    const openRecord = await prisma.attendanceRecord.findFirst({
      where: { userId: input.userId, status: 'CHECKED_IN' },
    });

    const adminNote = `Manual ${input.action.toLowerCase().replace('_', ' ')} by admin. ${input.notes || ''}`.trim();
    let record;

    if (input.action === 'CLOCK_IN') {
      if (openRecord) throw new ValidationError('User is already clocked in', 'ALREADY_CLOCKED_IN');

      const now = new Date();
      const bs = adToBS(now);

      record = await prisma.attendanceRecord.create({
        data: {
          userId: input.userId,
          organizationId: user.organizationId!,
          checkInMethod: 'MANUAL',
          status: 'CHECKED_IN',
          notes: adminNote,
          bsYear: bs.year,
          bsMonth: bs.month,
          bsDay: bs.day,
        },
        include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
      });

      // Check for late arrival and notify admin (non-blocking)
      this.checkAndNotifyLateArrival(input.userId, user.organizationId!, now, record.id).catch(err => {
        log.error({ err }, 'Late arrival check failed');
      });

    } else {
      if (!openRecord) throw new ValidationError('User is not clocked in', 'NOT_CLOCKED_IN');

      const checkOutTime = new Date();
      const durationMinutes = Math.floor(
        (checkOutTime.getTime() - openRecord.checkInTime.getTime()) / 60000
      );

      record = await prisma.attendanceRecord.update({
        where: { id: openRecord.id },
        data: {
          checkOutTime,
          checkOutMethod: 'MANUAL',
          duration: durationMinutes,
          status: 'CHECKED_OUT',
          notes: openRecord.notes ? `${openRecord.notes} | ${adminNote}` : adminNote,
        },
        include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
      });
    }

    await this.logAudit({
      userId: input.userId,
      organizationId: user.organizationId!,
      action: input.action,
      method: 'MANUAL',
      success: true,
    });

    log.info({ userId: input.userId, action: input.action, adminId: currentUser.userId }, 'Manual attendance');

    return {
      action: input.action,
      record,
      message: `${user.firstName} ${user.lastName} manually ${input.action === 'CLOCK_IN' ? 'clocked in' : 'clocked out'}`,
    };
  }

  /**
   * Get current clock-in status for a user
   */
  async getStatus(userId: string) {
    const openRecord = await prisma.attendanceRecord.findFirst({
      where: { userId, status: 'CHECKED_IN' },
      select: { id: true, checkInTime: true, checkInMethod: true },
    });

    if (openRecord) {
      const durationMs = Date.now() - openRecord.checkInTime.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      return {
        isClockedIn: true,
        record: openRecord,
        currentDuration: { minutes: durationMinutes, formatted: `${hours}h ${minutes}m` },
      };
    }

    return { isClockedIn: false, record: null, currentDuration: null };
  }

  /**
   * Get attendance records for current user
   */
  async getMyAttendance(userId: string, limit: number, offset: number) {
    const where = { userId };

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        select: {
          id: true, checkInTime: true, checkOutTime: true,
          checkInMethod: true, checkOutMethod: true,
          duration: true, status: true, isActive: true, notes: true,
          bsYear: true, bsMonth: true, bsDay: true,
        },
        orderBy: { checkInTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records, pagination: { total, limit, offset, hasMore: offset + records.length < total } };
  }

  /**
   * List all attendance records (admin) — org-scoped
   */
  async listAttendance(currentUser: JWTPayload, limit: number, offset: number, filters: { userId?: string; status?: string }) {
    const where: Record<string, unknown> = {};

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        select: {
          id: true, checkInTime: true, checkOutTime: true,
          checkInMethod: true, checkOutMethod: true,
          duration: true, status: true, isActive: true, notes: true,
          bsYear: true, bsMonth: true, bsDay: true,
          isManualEntry: true, modifiedBy: true, modificationNote: true, originalCheckIn: true, originalCheckOut: true,
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true } },
        },
        orderBy: { checkInTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records, pagination: { total, limit, offset, hasMore: offset + records.length < total } };
  }

  // ======== Private helpers ========

  private async validateQRPayload(qrPayload: string, organizationId: string) {
    const parsed = parseQRPayload(qrPayload);
    if (!parsed) throw new ValidationError('Invalid QR code format', 'INVALID_QR_FORMAT');

    const { token, signature } = parsed;

    if (!verifyQRSignature(token, signature)) {
      throw new ValidationError('Invalid QR code signature', 'INVALID_QR_SIGNATURE');
    }

    const qrCode = await prisma.qRCode.findUnique({ where: { token } });
    if (!qrCode) throw new ValidationError('QR code not found', 'QR_NOT_FOUND');
    if (qrCode.status !== 'ACTIVE') throw new ValidationError('QR code has been revoked', 'QR_REVOKED');
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) throw new ValidationError('QR code has expired', 'QR_EXPIRED');

    if (qrCode.organizationId !== organizationId) {
      throw new ValidationError('QR code does not belong to your organization', 'QR_ORG_MISMATCH');
    }

    await prisma.qRCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 } },
    });
  }

  private async checkCooldown(userId: string) {
    const cooldownTime = new Date(Date.now() - SCAN_COOLDOWN_MINUTES * 60 * 1000);

    const recentAction = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        OR: [
          { checkInTime: { gte: cooldownTime } },
          { checkOutTime: { gte: cooldownTime } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (recentAction) {
      const lastActionTime = recentAction.checkOutTime || recentAction.checkInTime;
      const timeSince = Math.floor((Date.now() - lastActionTime.getTime()) / 1000);
      const waitTime = SCAN_COOLDOWN_MINUTES * 60 - timeSince;
      if (waitTime > 0) {
        throw new ValidationError(
          `Please wait ${Math.ceil(waitTime / 60)} minute(s) before scanning again`,
          'COOLDOWN_ACTIVE'
        );
      }
    }
  }

  private async checkDailyLimit(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.attendanceRecord.count({
      where: {
        userId,
        checkInTime: { gte: todayStart, lte: todayEnd },
      },
    });

    if (todayCount >= MAX_DAILY_SCANS) {
      throw new ValidationError(
        `Daily scan limit reached (${MAX_DAILY_SCANS} actions per day)`,
        'DAILY_LIMIT_REACHED'
      );
    }
  }

  private async checkAndNotifyLateArrival(
    userId: string,
    organizationId: string,
    checkInTime: Date,
    attendanceId: string
  ) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { workStartTime: true, lateThresholdMinutes: true },
      });

      if (!org || !org.workStartTime) return;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) return;

      const [startHour, startMinute] = org.workStartTime.split(':').map(Number);
      const workStart = new Date(checkInTime);
      workStart.setHours(startHour, startMinute, 0, 0);

      const diffMs = checkInTime.getTime() - workStart.getTime();
      const minutesLate = Math.floor(diffMs / 60000);

      const threshold = org.lateThresholdMinutes || 10;
      if (minutesLate > threshold) {
        const userName = `${user.firstName} ${user.lastName}`;
        await notificationService.createLateArrivalNotification(
          organizationId,
          userId,
          userName,
          minutesLate,
          checkInTime,
          attendanceId
        );
        log.info({ userId, userName, minutesLate, checkInTime }, 'Late arrival notification created');
      }
    } catch (error) {
      log.error({ error, userId, organizationId }, 'Failed to check/notify late arrival');
    }
  }

  private async performClockAction(userId: string, organizationId: string, method: 'QR_SCAN' | 'MANUAL' | 'MOBILE_CHECKIN') {
    const openRecord = await prisma.attendanceRecord.findFirst({
      where: { userId, status: 'CHECKED_IN' },
    });

    if (openRecord) {
      const checkOutTime = new Date();
      const durationMinutes = Math.floor(
        (checkOutTime.getTime() - openRecord.checkInTime.getTime()) / 60000
      );

      const record = await prisma.attendanceRecord.update({
        where: { id: openRecord.id },
        data: {
          checkOutTime,
          checkOutMethod: method,
          duration: durationMinutes,
          status: 'CHECKED_OUT',
        },
        include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
      });

      return { action: 'CLOCK_OUT' as const, record };
    } else {
      const now = new Date();
      const bs = adToBS(now);

      const record = await prisma.attendanceRecord.create({
        data: {
          userId,
          organizationId,
          checkInMethod: method,
          status: 'CHECKED_IN',
          bsYear: bs.year,
          bsMonth: bs.month,
          bsDay: bs.day,
        },
        include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
      });

      this.checkAndNotifyLateArrival(userId, organizationId, now, record.id).catch(err => {
        log.error({ err }, 'Late arrival check failed');
      });

      return { action: 'CLOCK_IN' as const, record };
    }
  }

  private async logAudit(data: {
    employeeId?: string;
    userId?: string;
    organizationId?: string;
    action: string;
    method: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    qrToken?: string;
    totpDeviceId?: string;
  }) {
    try {
      await prisma.attendanceAuditLog.create({ data });
    } catch (err) {
      log.error({ err, data }, 'Failed to write audit log');
    }
  }

  /**
   * Admin edits an attendance record
   */
  async editAttendance(recordId: string, input: { checkInTime?: string; checkOutTime?: string; note: string; markPresent?: boolean }, currentUser: JWTPayload) {
    const record = await prisma.attendanceRecord.findFirst({
      where: { id: recordId, organizationId: currentUser.organizationId ?? undefined },
    });

    if (!record) {
      throw new NotFoundError('Attendance record not found');
    }

    const updateData: any = {
      modifiedBy: currentUser.userId,
      modifiedAt: new Date(),
      modificationNote: input.note,
    };

    if (!record.originalCheckIn) {
      updateData.originalCheckIn = record.checkInTime;
    }
    if (!record.originalCheckOut && record.checkOutTime) {
      updateData.originalCheckOut = record.checkOutTime;
    }

    if (input.checkInTime) {
      updateData.checkInTime = new Date(input.checkInTime);
    }

    if (input.checkOutTime) {
      updateData.checkOutTime = new Date(input.checkOutTime);
      updateData.status = 'CHECKED_OUT';
      const checkIn = input.checkInTime ? new Date(input.checkInTime) : record.checkInTime;
      const checkOut = new Date(input.checkOutTime);
      updateData.duration = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: updateData,
      include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
    });

    log.info({ recordId, adminId: currentUser.userId, note: input.note }, 'Attendance record edited by admin');
    return updated;
  }

  /**
   * Admin creates a manual present entry for an absent employee
   */
  async markPresent(input: { userId: string; date: string; checkInTime: string; checkOutTime?: string; note: string }, currentUser: JWTPayload) {
    const employee = await prisma.user.findFirst({
      where: { id: input.userId, organizationId: currentUser.organizationId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const dateStart = new Date(input.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(input.date);
    dateEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId: input.userId,
        organizationId: currentUser.organizationId ?? undefined,
        checkInTime: { gte: dateStart, lte: dateEnd },
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictError('Attendance record already exists for this date');
    }

    const checkIn = new Date(input.checkInTime);
    const checkOut = input.checkOutTime ? new Date(input.checkOutTime) : null;
    const duration = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)) : null;

    const bs = adToBS(checkIn);

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: input.userId,
        organizationId: currentUser.organizationId!,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        checkInMethod: 'MANUAL',
        checkOutMethod: checkOut ? 'MANUAL' : undefined,
        duration,
        status: checkOut ? 'CHECKED_OUT' : 'CHECKED_IN',
        isManualEntry: true,
        modifiedBy: currentUser.userId,
        modifiedAt: new Date(),
        modificationNote: input.note,
        notes: 'Manual entry: ' + input.note,
        bsYear: bs.year,
        bsMonth: bs.month,
        bsDay: bs.day,
      },
      include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
    });

    log.info({ userId: input.userId, adminId: currentUser.userId, date: input.date, note: input.note }, 'Employee marked present by admin');
    return record;
  }
}

export const attendanceService = new AttendanceService();
