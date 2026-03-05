import prisma from '../lib/prisma';
import { parseQRPayload, verifyQRSignature } from '../lib/crypto';
import { verifyPassword } from '../lib/password';
import { adToBS } from '../lib/nepali-date';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';
import {
  ScanPublicInput,
  ScanAuthenticatedInput,
  ManualAttendanceInput,
  MobileCheckinInput,
} from '../schemas/attendance.schema';
import { notificationService } from './notification.service';
import { payrollService } from './payroll.service';

const log = createLogger('attendance-service');

const SCAN_COOLDOWN_MINUTES = 2;
const MAX_DAILY_SCANS = 4;
const MAX_EDIT_WINDOW_DAYS = 90;

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateTimestamp(raw: string, fieldName: string): Date {
  const d = new Date(raw);
  if (isNaN(d.getTime())) throw new ValidationError(`${fieldName} is not a valid date`, 'INVALID_DATE');
  const now = new Date();
  if (d > now) throw new ValidationError(`${fieldName} cannot be in the future`, 'FUTURE_DATE');
  const cutoff = new Date(now.getTime() - MAX_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (d < cutoff) throw new ValidationError(`${fieldName} cannot be more than ${MAX_EDIT_WINDOW_DAYS} days in the past`, 'DATE_TOO_OLD');
  return d;
}

export class AttendanceService {

  // ======== QR / mobile scans ========

  async scanPublic(input: ScanPublicInput, ipAddress?: string, userAgent?: string) {
    // employeeId lives on OrgMembership — confirmed field in schema
    const membership = await prisma.orgMembership.findFirst({
      where: { employeeId: input.employeeId, isActive: true, deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!membership) {
      await this.logAudit({ employeeId: input.employeeId, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'EMPLOYEE_NOT_FOUND', ipAddress, userAgent });
      throw new ValidationError('Invalid employee ID or QR code', 'INVALID_SCAN');
    }

    // attendancePinHash lives on OrgMembership — confirmed field in schema
    if (!membership.attendancePinHash) {
      throw new ValidationError('Attendance PIN not set. Please contact your administrator.', 'PIN_NOT_SET');
    }

    const isPinValid = await verifyPassword(input.pin, membership.attendancePinHash);
    if (!isPinValid) {
      await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'INVALID_PIN', ipAddress, userAgent });
      throw new ValidationError('Invalid employee ID or QR code', 'INVALID_SCAN');
    }

    await this.validateQRPayload(input.qrPayload, membership.organizationId);

    const org = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { geofenceEnabled: true, officeLat: true, officeLng: true, geofenceRadius: true },
    });
    if (org?.geofenceEnabled && org.officeLat && org.officeLng) {
      if (!input.latitude || !input.longitude) throw new ValidationError('Location is required. Please enable GPS on your device.');
      const distance = calculateDistance(input.latitude, input.longitude, org.officeLat, org.officeLng);
      if (distance > (org.geofenceRadius || 100)) {
        await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'OUTSIDE_GEOFENCE', ipAddress, userAgent });
        throw new ValidationError('You are ' + Math.round(distance) + 'm from office. Must be within ' + org.geofenceRadius + 'm.');
      }
    }

    const result = await this.performClockActionSafe(membership.id, membership.organizationId, 'QR_SCAN');

    await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: result.action, method: 'QR_SCAN', success: true, ipAddress, userAgent });

    const userName = `${membership.user.firstName} ${membership.user.lastName}`;
    const message = result.action === 'CLOCK_IN'
      ? `${userName} clocked in at ${result.record.checkInTime.toLocaleTimeString()}`
      : `${userName} clocked out. Duration: ${result.record.duration} minutes`;

    return {
      ...result,
      message,
      user: { firstName: membership.user.firstName, lastName: membership.user.lastName, employeeId: membership.employeeId },
    };
  }

  async mobileCheckin(input: MobileCheckinInput, ipAddress?: string, userAgent?: string) {
    const membership = await prisma.orgMembership.findFirst({
      where: { employeeId: input.employeeId, isActive: true, deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!membership) {
      await this.logAudit({ employeeId: input.employeeId, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'EMPLOYEE_NOT_FOUND', ipAddress, userAgent });
      throw new ValidationError('Invalid employee ID or QR code', 'INVALID_SCAN');
    }

    if (!membership.attendancePinHash) {
      throw new ValidationError('Attendance PIN not set. Please contact your administrator.', 'PIN_NOT_SET');
    }

    const isPinValid = await verifyPassword(input.pin, membership.attendancePinHash);
    if (!isPinValid) {
      await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'INVALID_PIN', ipAddress, userAgent });
      throw new ValidationError('Invalid employee ID or QR code', 'INVALID_SCAN');
    }

    const org = await prisma.organization.findUnique({ where: { id: membership.organizationId } });
    if (!org) throw new NotFoundError('Organization not found');

    if (org.attendanceMode === 'QR_ONLY') {
      throw new ValidationError('Mobile check-in is not enabled for this organization. Please use QR scan.');
    }
    if (!org.geofenceEnabled || !org.officeLat || !org.officeLng) {
      throw new ValidationError('Geofencing must be enabled for mobile check-in. Contact your administrator.');
    }

    const distance = calculateDistance(input.latitude, input.longitude, org.officeLat, org.officeLng);
    if (distance > (org.geofenceRadius || 100)) {
      await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: 'FAILED', method: 'MOBILE_CHECKIN', success: false, failureReason: 'OUTSIDE_GEOFENCE', ipAddress, userAgent });
      throw new ValidationError('You are ' + Math.round(distance) + 'm from office. Must be within ' + org.geofenceRadius + 'm.');
    }

    const result = await this.performClockActionSafe(membership.id, membership.organizationId, 'MOBILE_CHECKIN');

    await this.logAudit({ employeeId: input.employeeId, userId: membership.user.id, organizationId: membership.organizationId, action: result.action, method: 'MOBILE_CHECKIN', success: true, ipAddress, userAgent });

    const userName = membership.user.firstName + ' ' + membership.user.lastName;
    const message = result.action === 'CLOCK_IN'
      ? userName + ' clocked in at ' + result.record.checkInTime.toLocaleTimeString()
      : userName + ' clocked out. Duration: ' + result.record.duration + ' minutes';

    return {
      ...result,
      message,
      user: { firstName: membership.user.firstName, lastName: membership.user.lastName, employeeId: membership.employeeId },
    };
  }

  async scanAuthenticated(input: ScanAuthenticatedInput, currentUser: JWTPayload, ipAddress?: string, userAgent?: string) {
    if (!currentUser.membershipId || !currentUser.organizationId) {
      throw new NotFoundError('Active membership not found');
    }

    await this.validateQRPayload(input.qrPayload, currentUser.organizationId);

    const org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
      select: { geofenceEnabled: true, officeLat: true, officeLng: true, geofenceRadius: true },
    });
    if (org?.geofenceEnabled && org.officeLat && org.officeLng) {
      if (!input.latitude || !input.longitude) throw new ValidationError('Location is required. Please enable GPS on your device.');
      const distance = calculateDistance(input.latitude, input.longitude, org.officeLat, org.officeLng);
      if (distance > (org.geofenceRadius || 100)) {
        await this.logAudit({ userId: currentUser.userId, organizationId: currentUser.organizationId, action: 'FAILED', method: 'QR_SCAN', success: false, failureReason: 'OUTSIDE_GEOFENCE', ipAddress, userAgent });
        throw new ValidationError('You are ' + Math.round(distance) + 'm from office. Must be within ' + org.geofenceRadius + 'm.');
      }
    }

    const result = await this.performClockActionSafe(currentUser.membershipId, currentUser.organizationId, 'QR_SCAN');

    await this.logAudit({ userId: currentUser.userId, organizationId: currentUser.organizationId, action: result.action, method: 'QR_SCAN', success: true, ipAddress, userAgent });

    const message = result.action === 'CLOCK_IN'
      ? `Clocked in at ${result.record.checkInTime.toLocaleTimeString()}`
      : `Clocked out. Duration: ${result.record.duration} minutes`;

    return { ...result, message };
  }

  // ======== Admin manual operations ========

  async manualAttendance(input: ManualAttendanceInput, currentUser: JWTPayload) {
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: input.userId,
        ...(currentUser.role !== 'SUPER_ADMIN' ? { organizationId: currentUser.organizationId! } : {}),
        isActive: true,
        deletedAt: null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!membership) throw new NotFoundError('Employee not found or not active in this organization');

    const openRecord = await prisma.attendanceRecord.findFirst({
      where: { membershipId: membership.id, status: 'CHECKED_IN' },
    });

    const adminNote = `Manual ${input.action.toLowerCase().replace('_', ' ')} by admin. ${input.notes || ''}`.trim();
    let record: any;

    if (input.action === 'CLOCK_IN') {
      if (openRecord) throw new ValidationError('User is already clocked in', 'ALREADY_CLOCKED_IN');

      const now = new Date();
      const bs = adToBS(now);

      record = await prisma.attendanceRecord.create({
        data: {
          membershipId: membership.id,
          organizationId: membership.organizationId,
          checkInMethod: 'MANUAL',
          status: 'CHECKED_IN',
          notes: adminNote,
          bsYear: bs.year,
          bsMonth: bs.month,
          bsDay: bs.day,
        },
      });

      this.checkAndNotifyLateArrival(membership.id, membership.organizationId, now, record.id).catch(err =>
        log.error({ err }, 'Late arrival check failed')
      );
    } else {
      if (!openRecord) throw new ValidationError('User is not clocked in', 'NOT_CLOCKED_IN');

      const checkOutTime = new Date();
      const durationMinutes = Math.floor((checkOutTime.getTime() - openRecord.checkInTime.getTime()) / 60000);

      record = await prisma.attendanceRecord.update({
        where: { id: openRecord.id },
        data: {
          checkOutTime,
          checkOutMethod: 'MANUAL',
          duration: durationMinutes,
          status: 'CHECKED_OUT',
          notes: openRecord.notes ? `${openRecord.notes} | ${adminNote}` : adminNote,
        },
      });
    }

    await this.logAudit({ userId: membership.user.id, organizationId: membership.organizationId, action: input.action, method: 'MANUAL', success: true });

    log.info({ membershipId: membership.id, action: input.action, adminId: currentUser.userId }, 'Manual attendance');

    // Construct the same shape the old code returned from include: { user: ... }
    return {
      action: input.action,
      record: {
        ...record,
        user: {
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          employeeId: membership.employeeId,
        },
      },
      message: `${membership.user.firstName} ${membership.user.lastName} manually ${input.action === 'CLOCK_IN' ? 'clocked in' : 'clocked out'}`,
    };
  }

  async editAttendance(
    recordId: string,
    input: { checkInTime?: string; checkOutTime?: string; note: string; markPresent?: boolean },
    currentUser: JWTPayload
  ) {
    if (!currentUser.organizationId) {
      throw new ValidationError('Organization context required to edit attendance records', 'ORG_REQUIRED');
    }

    // membershipId is confirmed field on AttendanceRecord in schema
    const record = await prisma.attendanceRecord.findFirst({
      where: { id: recordId, organizationId: currentUser.organizationId },
    });

    if (!record) throw new NotFoundError('Attendance record not found');

    const updateData: Record<string, unknown> = {
      modifiedBy: currentUser.userId,
      modifiedAt: new Date(),
      modificationNote: input.note,
    };

    if (!record.originalCheckIn) updateData.originalCheckIn = record.checkInTime;
    if (!record.originalCheckOut && record.checkOutTime) updateData.originalCheckOut = record.checkOutTime;

    let resolvedCheckIn: Date = record.checkInTime;
    if (input.checkInTime) {
      resolvedCheckIn = validateTimestamp(input.checkInTime, 'checkInTime');
      updateData.checkInTime = resolvedCheckIn;
    }

    if (input.checkOutTime) {
      const resolvedCheckOut = validateTimestamp(input.checkOutTime, 'checkOutTime');
      if (resolvedCheckOut <= resolvedCheckIn) throw new ValidationError('checkOutTime must be after checkInTime', 'INVALID_TIME_RANGE');
      updateData.checkOutTime = resolvedCheckOut;
      updateData.status = 'CHECKED_OUT';
      updateData.duration = Math.round((resolvedCheckOut.getTime() - resolvedCheckIn.getTime()) / (1000 * 60));
    }

    // "membership" is the confirmed relation name on AttendanceRecord (from schema)
    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: updateData,
      include: {
        membership: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    log.info({ recordId, adminId: currentUser.userId, note: input.note }, 'Attendance record edited by admin');

    const bs = adToBS(resolvedCheckIn);
    this.flagPayrollAfterAttendanceChange(
      record.membershipId,
      record.organizationId,
      bs.year,
      bs.month,
      currentUser.userId,
      recordId,
      `Admin edited attendance record ${recordId}: ${input.note}`
    );

    return {
      ...updated,
      user: {
        firstName: updated.membership.user.firstName,
        lastName: updated.membership.user.lastName,
        employeeId: updated.membership.employeeId,
      },
    };
  }

  async markPresent(
    input: { userId: string; date: string; checkInTime: string; checkOutTime?: string; note: string },
    currentUser: JWTPayload
  ) {
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: input.userId,
        organizationId: currentUser.organizationId!,
        isActive: true,
        deletedAt: null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!membership) throw new NotFoundError('Employee not found or not active in this organization');

    const checkIn = validateTimestamp(input.checkInTime, 'checkInTime');

    let checkOut: Date | null = null;
    if (input.checkOutTime) {
      checkOut = validateTimestamp(input.checkOutTime, 'checkOutTime');
      if (checkOut <= checkIn) throw new ValidationError('checkOutTime must be after checkInTime', 'INVALID_TIME_RANGE');
    }

    const dateStart = new Date(input.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(input.date);
    dateEnd.setHours(23, 59, 59, 999);

    if (isNaN(dateStart.getTime())) throw new ValidationError('date is not a valid date', 'INVALID_DATE');

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        membershipId: membership.id,
        organizationId: currentUser.organizationId!,
        checkInTime: { gte: dateStart, lte: dateEnd },
        isActive: true,
      },
    });

    if (existing) throw new ConflictError('Attendance record already exists for this date');

    const duration = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)) : null;
    const bs = adToBS(checkIn);

    const record = await prisma.attendanceRecord.create({
      data: {
        membershipId: membership.id,
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
    });

    log.info({ membershipId: membership.id, adminId: currentUser.userId, date: input.date }, 'Employee marked present by admin');

    const payrollFlag = await payrollService.flagPayrollNeedsRecalculation(
      membership.id,
      currentUser.organizationId!,
      bs.year,
      bs.month,
      currentUser.userId,
      record.id,
      `Admin marked employee present for ${input.date}: ${input.note}`
    );

    return {
      record: {
        ...record,
        user: {
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          employeeId: membership.employeeId,
        },
      },
      payrollWarning: payrollFlag.flagged
        ? `A payslip for ${bs.year}/${bs.month} already existed (was: ${payrollFlag.previousStatus}). It has been flagged for recalculation — please regenerate it before the next payroll run.`
        : null,
    };
  }

  // ======== Read methods ========

  async getStatus(membershipId: string) {
    const openRecord = await prisma.attendanceRecord.findFirst({
      where: { membershipId, status: 'CHECKED_IN' },
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

  async getMyAttendance(membershipId: string, limit: number, offset: number) {
    const where = { membershipId };

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

  async listAttendance(
    currentUser: JWTPayload,
    limit: number,
    offset: number,
    filters: { userId?: string; status?: string }
  ) {
    const where: Record<string, unknown> = {};

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    // BUG FIX: Resolve userId → ALL memberships for that user in this org.
    // No isActive filter — admin must be able to view departed employees' historical records.
    // @@unique([userId, organizationId]) on OrgMembership means at most one row returned,
    // but findMany + { in: [...] } is the correct pattern for this filter style.
    if (filters.userId) {
      const orgId = currentUser.role !== 'SUPER_ADMIN' ? currentUser.organizationId! : undefined;
      const memberships = await prisma.orgMembership.findMany({
        where: {
          userId: filters.userId,
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: { id: true },
      });
      if (memberships.length === 0) {
        return { records: [], pagination: { total: 0, limit, offset, hasMore: false } };
      }
      where.membershipId = { in: memberships.map((m) => m.id) };
    }

    if (filters.status) where.status = filters.status;

    const [rawRecords, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        // "membership" is the confirmed relation name on AttendanceRecord in schema
        include: {
          membership: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    // Flatten membership → top-level user for frontend compatibility
    const records = rawRecords.map((r) => ({
      id: r.id,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      checkInMethod: r.checkInMethod,
      checkOutMethod: r.checkOutMethod,
      duration: r.duration,
      status: r.status,
      isActive: r.isActive,
      notes: r.notes,
      bsYear: r.bsYear,
      bsMonth: r.bsMonth,
      bsDay: r.bsDay,
      isManualEntry: r.isManualEntry,
      modifiedBy: r.modifiedBy,
      modificationNote: r.modificationNote,
      originalCheckIn: r.originalCheckIn,
      originalCheckOut: r.originalCheckOut,
      user: {
        id: r.membership.user.id,
        firstName: r.membership.user.firstName,
        lastName: r.membership.user.lastName,
        employeeId: r.membership.employeeId,
        email: r.membership.user.email,
      },
    }));

    return { records, pagination: { total, limit, offset, hasMore: offset + records.length < total } };
  }

  // ======== Private helpers ========

  private async validateQRPayload(qrPayload: string, organizationId: string) {
    const parsed = parseQRPayload(qrPayload);
    if (!parsed) throw new ValidationError('Invalid QR code format', 'INVALID_QR_FORMAT');

    const { token, signature } = parsed;
    if (!verifyQRSignature(token, signature)) throw new ValidationError('Invalid QR code signature', 'INVALID_QR_SIGNATURE');

    const qrCode = await prisma.qRCode.findUnique({ where: { token } });
    if (!qrCode) throw new ValidationError('QR code not found', 'QR_NOT_FOUND');
    if (qrCode.status !== 'ACTIVE') throw new ValidationError('QR code has been revoked', 'QR_REVOKED');
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) throw new ValidationError('QR code has expired', 'QR_EXPIRED');
    if (qrCode.organizationId !== organizationId) throw new ValidationError('QR code does not belong to your organization', 'QR_ORG_MISMATCH');

    await prisma.qRCode.update({ where: { id: qrCode.id }, data: { scanCount: { increment: 1 } } });
  }

  private async checkAndNotifyLateArrival(
    membershipId: string,
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

      // Fetch user details through membership — confirmed relation in schema
      const membership = await prisma.orgMembership.findUnique({
        where: { id: membershipId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });
      if (!membership) return;

      const [startHour, startMinute] = org.workStartTime.split(':').map(Number);
      const workStart = new Date(checkInTime);
      workStart.setHours(startHour, startMinute, 0, 0);

      const minutesLate = Math.floor((checkInTime.getTime() - workStart.getTime()) / 60000);
      const threshold = org.lateThresholdMinutes || 10;

      if (minutesLate > threshold) {
        const userName = `${membership.user.firstName} ${membership.user.lastName}`;
        await notificationService.createLateArrivalNotification(
          organizationId,
          membershipId,
          userName,
          minutesLate,
          checkInTime,
          attendanceId
        );
        log.info({ membershipId, userName, minutesLate, checkInTime }, 'Late arrival notification created');
      }
    } catch (error) {
      log.error({ error, membershipId, organizationId }, 'Failed to check/notify late arrival');
    }
  }

  // BUG FIX: Include membership.user so result.record.user exists for callers.
  // Old code did include: { user: ... } on every create/update.
  // New code includes membership.user and flattens to record.user before returning.
  private async performClockActionSafe(
    membershipId: string,
    organizationId: string,
    method: 'QR_SCAN' | 'MANUAL' | 'MOBILE_CHECKIN'
  ) {
    return prisma.$transaction(async (tx) => {
      // Cooldown check
      const cooldownTime = new Date(Date.now() - SCAN_COOLDOWN_MINUTES * 60 * 1000);
      const recentAction = await tx.attendanceRecord.findFirst({
        where: {
          membershipId,
          OR: [{ checkInTime: { gte: cooldownTime } }, { checkOutTime: { gte: cooldownTime } }],
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (recentAction) {
        const lastActionTime = recentAction.checkOutTime || recentAction.checkInTime;
        const timeSince = Math.floor((Date.now() - lastActionTime.getTime()) / 1000);
        const waitTime = SCAN_COOLDOWN_MINUTES * 60 - timeSince;
        if (waitTime > 0) throw new ValidationError(`Please wait ${Math.ceil(waitTime / 60)} minute(s) before scanning again`, 'COOLDOWN_ACTIVE');
      }

      // Daily limit check
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todayCount = await tx.attendanceRecord.count({ where: { membershipId, checkInTime: { gte: todayStart, lte: todayEnd } } });
      if (todayCount >= MAX_DAILY_SCANS) throw new ValidationError(`Daily scan limit reached (${MAX_DAILY_SCANS} actions per day)`, 'DAILY_LIMIT_REACHED');

      const openRecord = await tx.attendanceRecord.findFirst({ where: { membershipId, status: 'CHECKED_IN' } });

      if (openRecord) {
        // Clock OUT
        const checkOutTime = new Date();
        const durationMinutes = Math.floor((checkOutTime.getTime() - openRecord.checkInTime.getTime()) / 60000);
        const record = await tx.attendanceRecord.update({
          where: { id: openRecord.id },
          data: { checkOutTime, checkOutMethod: method, duration: durationMinutes, status: 'CHECKED_OUT' },
          include: {
            membership: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        });
        return {
          action: 'CLOCK_OUT' as const,
          record: {
            ...record,
            user: { firstName: record.membership.user.firstName, lastName: record.membership.user.lastName, employeeId: record.membership.employeeId },
          },
        };
      } else {
        // Clock IN
        const now = new Date();
        const bs = adToBS(now);
        const record = await tx.attendanceRecord.create({
          data: { membershipId, organizationId, checkInMethod: method, status: 'CHECKED_IN', bsYear: bs.year, bsMonth: bs.month, bsDay: bs.day },
          include: {
            membership: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        });
        this.checkAndNotifyLateArrival(membershipId, organizationId, now, record.id).catch(err =>
          log.error({ err }, 'Late arrival check failed')
        );
        return {
          action: 'CLOCK_IN' as const,
          record: {
            ...record,
            user: { firstName: record.membership.user.firstName, lastName: record.membership.user.lastName, employeeId: record.membership.employeeId },
          },
        };
      }
    }, { isolationLevel: 'Serializable' });
  }

  private flagPayrollAfterAttendanceChange(
    membershipId: string,
    organizationId: string,
    bsYear: number,
    bsMonth: number,
    triggeredBy: string,
    attendanceRecordId: string,
    reason: string
  ) {
    payrollService
      .flagPayrollNeedsRecalculation(membershipId, organizationId, bsYear, bsMonth, triggeredBy, attendanceRecordId, reason)
      .catch(err => log.error({ err }, 'Failed to flag payroll after attendance correction'));
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
}

export const attendanceService = new AttendanceService();