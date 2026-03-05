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
   * Request leave (any employee with an active membership)
   */
  async requestLeave(input: CreateLeaveInput, currentUser: JWTPayload) {
    const { startDate, endDate, reason, type } = input;

    if (!currentUser.membershipId) {
      throw new ValidationError('Active membership required to request leave', 'NO_MEMBERSHIP');
    }

    if (endDate < startDate) {
      throw new ValidationError('End date cannot be before start date');
    }

    // Check for overlapping requests — scoped to this membershipId
    const overlapping = await prisma.leave.findFirst({
      where: {
        membershipId: currentUser.membershipId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    });

    if (overlapping) throw new ConflictError('You already have a leave request for this period');

    const bsStart = adToBS(startDate);
    const bsEnd = adToBS(endDate);

    const leave = await prisma.leave.create({
      data: {
        membershipId: currentUser.membershipId,
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
        membership: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    log.info({ membershipId: currentUser.membershipId, type, durationDays }, 'Leave requested');

    // Email org admins — look up via OrgMembership role
    try {
      const adminMemberships = await prisma.orgMembership.findMany({
        where: {
          organizationId: currentUser.organizationId!,
          role: 'ORG_ADMIN',
          isActive: true,
          deletedAt: null,
        },
        include: { user: { select: { email: true, firstName: true } } },
      });

      const org = await prisma.organization.findUnique({
        where: { id: currentUser.organizationId! },
        select: { name: true },
      });

      for (const admin of adminMemberships) {
        emailService
          .sendLeaveRequestNotification({
            adminEmail: admin.user.email,
            adminName: admin.user.firstName,
            employeeName: `${leave.membership.user.firstName} ${leave.membership.user.lastName}`,
            employeeId: leave.membership.employeeId || '',
            leaveType: type,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason,
            orgName: org?.name || '',
          })
          .catch(err => log.error({ err }, 'Failed to send leave request email'));
      }
    } catch (err) {
      log.error({ err }, 'Failed to notify admins');
    }

    return {
      leave: {
        ...leave,
        user: {
          firstName: leave.membership.user.firstName,
          lastName: leave.membership.user.lastName,
          employeeId: leave.membership.employeeId,
          email: leave.membership.user.email,
        },
      },
      durationDays,
    };
  }

  /**
   * Approve or reject leave (admin only)
   */
  async updateLeaveStatus(
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
    currentUser: JWTPayload,
    rejectionMessage?: string
  ) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        membership: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    if (!leave) throw new NotFoundError('Leave request not found');

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
        membership: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    log.info({ leaveId, status, approvedBy: currentUser.userId }, 'Leave status updated');

    try {
      const approverName = (updated.approver?.firstName || '') + ' ' + (updated.approver?.lastName || '');
      emailService
        .sendLeaveDecisionNotification({
          to: updated.membership.user.email,
          employeeName: updated.membership.user.firstName,
          leaveType: updated.type,
          startDate: updated.startDate.toISOString().split('T')[0],
          endDate: updated.endDate.toISOString().split('T')[0],
          status: status as 'APPROVED' | 'REJECTED',
          approverName,
        })
        .catch(err => log.error({ err }, 'Failed to send leave decision email'));
    } catch (err) {
      log.error({ err }, 'Failed to notify employee');
    }

    return {
      ...updated,
      user: {
        firstName: updated.membership.user.firstName,
        lastName: updated.membership.user.lastName,
        employeeId: updated.membership.employeeId,
        email: updated.membership.user.email,
      },
    };
  }

  /**
   * Get my leave requests (employee)
   */
  async getMyLeaves(currentUser: JWTPayload, limit: number, offset: number, status?: string) {
    if (!currentUser.membershipId) {
      return { leaves: [], pagination: { total: 0, limit, offset, hasMore: false } };
    }

    const where: Record<string, unknown> = { membershipId: currentUser.membershipId };
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: { approver: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leave.count({ where }),
    ]);

    const enriched = leaves.map((l) => ({
      ...l,
      durationDays: Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    }));

    return { leaves: enriched, pagination: { total, limit, offset, hasMore: offset + leaves.length < total } };
  }

  /**
   * List all leave requests (admin) — org-scoped
   */
  async listLeaves(
    currentUser: JWTPayload,
    limit: number,
    offset: number,
    filters: { status?: string; userId?: string }
  ) {
    const where: Record<string, unknown> = {};

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    if (filters.status) where.status = filters.status;

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
        return { leaves: [], pagination: { total: 0, limit, offset, hasMore: false } };
      }
      where.membershipId = { in: memberships.map((m) => m.id) };
    }

    const [rawLeaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          membership: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leave.count({ where }),
    ]);

    const leaves = rawLeaves.map((l) => ({
      ...l,
      durationDays: Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      user: {
        id: l.membership.user.id,
        firstName: l.membership.user.firstName,
        lastName: l.membership.user.lastName,
        employeeId: l.membership.employeeId,
        email: l.membership.user.email,
      },
    }));

    return { leaves, pagination: { total, limit, offset, hasMore: offset + leaves.length < total } };
  }

  /**
   * Cancel leave (employee can cancel their own pending leave)
   */
  async cancelLeave(leaveId: string, currentUser: JWTPayload) {
    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });

    if (!leave) throw new NotFoundError('Leave request not found');

    if (leave.membershipId !== currentUser.membershipId) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError('Can only cancel pending leave requests');
    }

    await prisma.leave.delete({ where: { id: leaveId } });

    log.info({ leaveId, membershipId: currentUser.membershipId }, 'Leave cancelled');

    return { message: 'Leave request cancelled' };
  }

  /**
   * Get leave summary for a membership (used by payroll/reports).
   */
  async getLeaveSummary(membershipId: string, startDate: Date, endDate: Date) {
    const leaves = await prisma.leave.findMany({
      where: {
        membershipId,
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
      const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays += days;
      byType[leave.type] = (byType[leave.type] || 0) + days;
    }

    return { totalDays, byType, leaves };
  }
}

export const leaveService = new LeaveService();