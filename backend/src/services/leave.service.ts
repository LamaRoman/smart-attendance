import prisma from '../lib/prisma';
import { adToBS } from '../lib/nepali-date';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { emailService } from './email.service';
import { JWTPayload } from '../lib/jwt';
import { CreateLeaveInput } from '../schemas/leave.schema';

const log = createLogger('leave-service');

export class LeaveService {
  /**
   * Request leave (any employee)
   */
  async requestLeave(input: CreateLeaveInput, currentUser: JWTPayload) {
    const { startDate, endDate, reason, type } = input;

    if (endDate < startDate) {
      throw new ValidationError('End date cannot be before start date');
    }

    // Check for overlapping leave requests
    const overlapping = await prisma.leave.findFirst({
      where: {
        userId: currentUser.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictError('You already have a leave request for this period');
    }

    // Calculate BS dates
    const bsStart = adToBS(startDate);
    const bsEnd = adToBS(endDate);

    const leave = await prisma.leave.create({
      data: {
        userId: currentUser.userId,
        organizationId: currentUser.organizationId!,
        startDate,
        endDate,
        reason,
        type,
        status: 'PENDING',
        bsStartYear: bsStart.year,
        bsStartMonth: bsStart.month,
        bsStartDay: bsStart.day,
        bsEndYear: bsEnd.year,
        bsEndMonth: bsEnd.month,
        bsEndDay: bsEnd.day,
      },
      include: {
        user: { select: { firstName: true, lastName: true, employeeId: true, email: true } },
      },
    });

    // Calculate duration in days
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    log.info({ userId: currentUser.userId, type, durationDays }, 'Leave requested');

    // Email notify admin(s)
    try {
      const admins = await prisma.user.findMany({
        where: { organizationId: currentUser.organizationId!, role: 'ORG_ADMIN', isActive: true },
        select: { email: true, firstName: true },
      });
      const org = await prisma.organization.findUnique({ where: { id: currentUser.organizationId! }, select: { name: true } });
      const empUser = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { firstName: true, lastName: true, employeeId: true } });
      for (const admin of admins) {
        emailService.sendLeaveRequestNotification({
          adminEmail: admin.email,
          adminName: admin.firstName,
          employeeName: (empUser?.firstName || '') + ' ' + (empUser?.lastName || ''),
          employeeId: empUser?.employeeId || '',
          leaveType: type,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          reason,
          orgName: org?.name || '',
        }).catch(err => log.error({ err }, 'Failed to send leave request email'));
      }
    } catch (err) { log.error({ err }, 'Failed to notify admins'); }

    return { leave, durationDays };
  }

  /**
   * Approve or reject leave (admin only)
   */
  async updateLeaveStatus(leaveId: string, status: "APPROVED" | "REJECTED", currentUser: JWTPayload, rejectionMessage?: string) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { user: { select: { firstName: true, lastName: true, employeeId: true, organizationId: true } } },
    });

    if (!leave) throw new NotFoundError('Leave request not found');

    // Org isolation
    if (currentUser.role !== 'SUPER_ADMIN' && leave.organizationId !== currentUser.organizationId) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError(`Cannot ${status.toLowerCase()} a leave that is already ${leave.status.toLowerCase()}`);
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status,
          ...(rejectionMessage ? { rejectionMessage } : {}),
        approvedBy: currentUser.userId,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, employeeId: true, email: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    log.info({ leaveId, status, approvedBy: currentUser.userId }, 'Leave status updated');

    // Email notify employee
    try {
      const approverName = (updated.approver?.firstName || '') + ' ' + (updated.approver?.lastName || '');
      emailService.sendLeaveDecisionNotification({
        to: updated.user.email,
        employeeName: updated.user.firstName,
        leaveType: updated.type,
        startDate: updated.startDate.toISOString().split('T')[0],
        endDate: updated.endDate.toISOString().split('T')[0],
        status: status as 'APPROVED' | 'REJECTED',
        approverName,
      }).catch(err => log.error({ err }, 'Failed to send leave decision email'));
    } catch (err) { log.error({ err }, 'Failed to notify employee'); }

    return updated;
  }

  /**
   * Get my leave requests (employee)
   */
  async getMyLeaves(currentUser: JWTPayload, limit: number, offset: number, status?: string) {
    const where: Record<string, unknown> = { userId: currentUser.userId };
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leave.count({ where }),
    ]);

    const enriched = leaves.map((l) => ({
      ...l,
      durationDays: Math.ceil(
        (l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1,
    }));

    return { leaves: enriched, pagination: { total, limit, offset, hasMore: offset + leaves.length < total } };
  }

  /**
   * List all leave requests (admin) — org-scoped
   */
  async listLeaves(currentUser: JWTPayload, limit: number, offset: number, filters: { status?: string; userId?: string }) {
    const where: Record<string, unknown> = {};

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leave.count({ where }),
    ]);

    const enriched = leaves.map((l) => ({
      ...l,
      durationDays: Math.ceil(
        (l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1,
    }));

    return { leaves: enriched, pagination: { total, limit, offset, hasMore: offset + leaves.length < total } };
  }

  /**
   * Cancel leave (employee can cancel their own pending leave)
   */
  async cancelLeave(leaveId: string, currentUser: JWTPayload) {
    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });

    if (!leave) throw new NotFoundError('Leave request not found');
    if (leave.userId !== currentUser.userId) throw new NotFoundError('Leave request not found');
    if (leave.status !== 'PENDING') {
      throw new ValidationError('Can only cancel pending leave requests');
    }

    await prisma.leave.delete({ where: { id: leaveId } });

    log.info({ leaveId, userId: currentUser.userId }, 'Leave cancelled');

    return { message: 'Leave request cancelled' };
  }

  /**
   * Get leave summary for an employee (used by payroll/reports)
   */
  async getLeaveSummary(userId: string, startDate: Date, endDate: Date) {
    const leaves = await prisma.leave.findMany({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    let totalDays = 0;
    const byType: Record<string, number> = {};

    for (const leave of leaves) {
      const leaveStart = leave.startDate > startDate ? leave.startDate : startDate;
      const leaveEnd = leave.endDate < endDate ? leave.endDate : endDate;
      const days = Math.ceil(
        (leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      totalDays += days;
      byType[leave.type] = (byType[leave.type] || 0) + days;
    }

    return { totalDays, byType, leaves };
  }
}

export const leaveService = new LeaveService();
