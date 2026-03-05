import prisma from '../lib/prisma';
import { JWTPayload } from '../lib/jwt';
import { hashPassword } from '../lib/password';
import { randomInt } from 'crypto';
import { NotFoundError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { emailService } from './email.service';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import { generatePlatformId } from '../utils/platformId';
import { invalidatePlanCache } from './plan.service';

const log = createLogger('user-service');

/**
 * Shape the combined user+membership data into a flat response object
 * that matches the previous API response shape. This minimizes frontend changes.
 */
function flattenMembershipResponse(membership: any) {
  const user = membership.user;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    platformId: user.platformId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // Membership fields (appear as if they're on User for backward compat)
    membershipId: membership.id,
    role: membership.role,
    employeeId: membership.employeeId,
    panNumber: membership.panNumber,
    isActive: membership.isActive,
    shiftStartTime: membership.shiftStartTime,
    shiftEndTime: membership.shiftEndTime,
    organizationId: membership.organizationId,
    joinedAt: membership.joinedAt,
    leftAt: membership.leftAt,
  };
}

// Select fields when querying memberships with user data
const MEMBERSHIP_WITH_USER_SELECT = {
  id: true,
  role: true,
  employeeId: true,
  panNumber: true,
  isActive: true,
  shiftStartTime: true,
  shiftEndTime: true,
  organizationId: true,
  joinedAt: true,
  leftAt: true,
  deletedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      platformId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export class UserService {

  /**
   * List users — scoped to organization via OrgMembership.
   * Only returns active memberships (not departed employees).
   */
  async listUsers(currentUser: JWTPayload) {
    // SUPER_ADMIN: list all users across all orgs
    if (currentUser.role === 'SUPER_ADMIN') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          platformId: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              employeeId: true,
              organizationId: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return users;
    }

    // Org users: list through OrgMembership
    if (!currentUser.organizationId) {
      return [];
    }

    const memberships = await prisma.orgMembership.findMany({
      where: {
        organizationId: currentUser.organizationId,
        deletedAt: null,
        leftAt: null,
      },
      select: MEMBERSHIP_WITH_USER_SELECT,
      orderBy: { user: { createdAt: 'desc' } },
    });

    return memberships.map(flattenMembershipResponse);
  }

  /**
   * Create user — creates User (if new) + OrgMembership in a transaction.
   * If user already exists (by email), only creates a new membership.
   */
  async createUser(input: CreateUserInput, currentUser: JWTPayload) {
    if ((input as any).role === 'SUPER_ADMIN') {
      throw new ConflictError('Cannot create super admin accounts');
    }

    const organizationId = currentUser.organizationId;
    if (!organizationId && currentUser.role !== 'SUPER_ADMIN') {
      throw new Error('No organization assigned to current user');
    }

    // Employee cap check — count active memberships, not users
    if (organizationId && currentUser.role !== 'SUPER_ADMIN') {
      const subscription = await prisma.orgSubscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      });

      if (subscription) {
        const cap = subscription.customMaxEmployees ?? subscription.plan.hardEmployeeCap;
        if (cap && subscription.currentEmployeeCount >= cap) {
          throw new ConflictError(
            `Employee limit reached. Your current plan allows up to ${cap} employees. Please upgrade to add more.`
          );
        }
      }
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    if (existingUser) {
      // User exists — check if they already have a membership in this org
      if (organizationId) {
        const existingMembership = await prisma.orgMembership.findUnique({
          where: { userId_organizationId: { userId: existingUser.id, organizationId } },
        });

        if (existingMembership) {
          if (existingMembership.isActive && !existingMembership.leftAt) {
            throw new ConflictError('User is already an active member of this organization');
          }
          // Reactivate departed membership
          throw new ConflictError(
            'User previously belonged to this organization. Use the reactivate flow instead.'
          );
        }
      }

      // User exists in another org — create new membership only
      // (Future: this is the "onboard by platformId" flow)
      throw new ConflictError('User with this email already exists on the platform');
    }

    // New user — create User + OrgMembership in transaction
    const hashedPassword = await hashPassword(input.password);
    const employeeId = await this.generateEmployeeId(organizationId);
    const platformId = await generatePlatformId();
    const plainPin = String(randomInt(1000, 9999 + 1)).padStart(4, '0');
    const attendancePinHash = await hashPassword(plainPin);

    const result = await prisma.$transaction(async (tx) => {
      // Create platform-level user
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          platformId,
          role: 'EMPLOYEE', // Platform-level default; effective role is on membership
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          platformId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create org membership
      const membership = await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organizationId!,
          role: input.role,
          employeeId,
          shiftStartTime: input.shiftStartTime || null,
          shiftEndTime: input.shiftEndTime || null,
          panNumber: input.panNumber || null,
          attendancePinHash,
          isActive: true,
        },
      });

      return { user, membership };
    });

    log.info(
      { userId: result.user.id, membershipId: result.membership.id, orgId: organizationId },
      'User and membership created'
    );

    // Sync employee count after creation
    if (organizationId) {
      await this.syncEmployeeCount(organizationId);
    }

    // Send welcome email with password reset link
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId! },
        select: { name: true },
      });

      const resetToken = await this.generatePasswordResetToken(result.user.id);

      emailService.sendWelcomeEmail({
        to: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeId,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        orgName: org?.name || '',
      }).catch(err => log.error({ err }, 'Failed to send welcome email'));
    } catch (err) {
      log.error({ err }, 'Failed to send welcome email');
    }

    return {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phone: result.user.phone,
      platformId: result.user.platformId,
      membershipId: result.membership.id,
      role: result.membership.role,
      employeeId: result.membership.employeeId,
      organizationId: result.membership.organizationId,
      isActive: result.membership.isActive,
      createdAt: result.user.createdAt,
      pin: plainPin,
    };
  }

  /**
   * Update user — splits updates between User (platform fields) and OrgMembership (org fields).
   * Includes last-admin guard on role changes.
   */
  async updateUser(userId: string, input: UpdateUserInput, currentUser: JWTPayload) {
    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // For non-SUPER_ADMIN: verify the target user has a membership in the same org
    let existingMembership: any = null;
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      existingMembership = await prisma.orgMembership.findFirst({
        where: {
          userId,
          organizationId: currentUser.organizationId,
        },
        select: { id: true, role: true, isActive: true, organizationId: true },
      });

      if (!existingMembership) {
        throw new NotFoundError('User not found in your organization');
      }
    }

    // Last-admin guard: before demoting an ORG_ADMIN, ensure another admin remains
    if (
      input.role &&
      input.role !== 'ORG_ADMIN' &&
      existingMembership?.role === 'ORG_ADMIN' &&
      existingMembership?.organizationId
    ) {
      const adminCount = await prisma.orgMembership.count({
        where: {
          organizationId: existingMembership.organizationId,
          role: 'ORG_ADMIN',
          isActive: true,
          leftAt: null,
          id: { not: existingMembership.id },
        },
      });

      if (adminCount < 1) {
        throw new ConflictError(
          'Cannot demote this admin — they are the last admin in the organization. Assign another admin first.'
        );
      }
    }

    // Split fields: User (platform) vs OrgMembership (org-scoped)
    const userUpdateData: Record<string, unknown> = {};
    const membershipUpdateData: Record<string, unknown> = {};

    // Platform-level fields → User table
    if (input.email) userUpdateData.email = input.email;
    if (input.firstName) userUpdateData.firstName = input.firstName;
    if (input.lastName) userUpdateData.lastName = input.lastName;
    if (input.phone !== undefined) userUpdateData.phone = input.phone;
    if (input.password) {
      userUpdateData.password = await hashPassword(input.password);
    }

    // Org-scoped fields → OrgMembership table
    if (input.role) membershipUpdateData.role = input.role;
    if (input.isActive !== undefined) membershipUpdateData.isActive = input.isActive;
    if (input.shiftStartTime !== undefined) membershipUpdateData.shiftStartTime = input.shiftStartTime || null;
    if (input.shiftEndTime !== undefined) membershipUpdateData.shiftEndTime = input.shiftEndTime || null;
    if (input.panNumber !== undefined) membershipUpdateData.panNumber = input.panNumber || null;

    // Execute updates in transaction
    const result = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      if (Object.keys(membershipUpdateData).length > 0 && existingMembership) {
        await tx.orgMembership.update({
          where: { id: existingMembership.id },
          data: membershipUpdateData,
        });
      }

      // Re-fetch combined data for response
      if (existingMembership) {
        return tx.orgMembership.findUnique({
          where: { id: existingMembership.id },
          select: MEMBERSHIP_WITH_USER_SELECT,
        });
      } else {
        // SUPER_ADMIN updating user without org context
        return tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            platformId: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }
    });

    log.info(
      { userId, updatedUserFields: Object.keys(userUpdateData), updatedMembershipFields: Object.keys(membershipUpdateData) },
      'User updated'
    );

    // Sync employee count if active status changed
    if (input.isActive !== undefined && existingMembership?.isActive !== input.isActive && existingMembership?.organizationId) {
      await this.syncEmployeeCount(existingMembership.organizationId);
    }

    // Return flattened response if membership exists
    if (existingMembership && result && 'user' in result) {
      return flattenMembershipResponse(result);
    }
    return result;
  }

  /**
   * Reset attendance PIN — admin action.
   * PIN now lives on OrgMembership.
   */
  async resetAttendancePin(userId: string, currentUser: JWTPayload) {
    if (!currentUser.organizationId) {
      throw new NotFoundError('No organization context');
    }

    // Find the target user's membership in this org
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });
    if (!membership) throw new NotFoundError('User not found in your organization');

    const pin = String(randomInt(1000, 9999 + 1)).padStart(4, '0');
    const attendancePinHash = await hashPassword(pin);

    await prisma.orgMembership.update({
      where: { id: membership.id },
      data: { attendancePinHash },
    });

    log.info({ membershipId: membership.id, resetBy: currentUser.userId }, 'Attendance PIN reset');
    return { pin, message: 'Attendance PIN reset successfully' };
  }

  /**
   * Remove employee from organization.
   * Deactivates membership — user account remains intact.
   * Replaces the old deleteUser which soft-deleted the user row.
   */
  async removeFromOrganization(userId: string, currentUser: JWTPayload) {
    if (userId === currentUser.userId) {
      throw new ConflictError('Cannot remove yourself from the organization');
    }

    if (!currentUser.organizationId) {
      throw new NotFoundError('No organization context');
    }

    // Find the membership
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId,
        organizationId: currentUser.organizationId,
      },
      select: { id: true, role: true, isActive: true, organizationId: true },
    });

    if (!membership) {
      throw new NotFoundError('User not found in your organization');
    }

    // Last-admin guard
    if (membership.role === 'ORG_ADMIN') {
      const adminCount = await prisma.orgMembership.count({
        where: {
          organizationId: membership.organizationId,
          role: 'ORG_ADMIN',
          isActive: true,
          leftAt: null,
          id: { not: membership.id },
        },
      });

      if (adminCount < 1) {
        throw new ConflictError(
          'Cannot remove this admin — they are the last admin in the organization. Assign another admin first.'
        );
      }
    }

    // Deactivate membership (user row untouched)
    await prisma.orgMembership.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        leftAt: new Date(),
        deletedAt: new Date(),
      },
    });

    log.info({ userId, membershipId: membership.id, removedBy: currentUser.userId }, 'Employee removed from organization');

    // Sync employee count
    await this.syncEmployeeCount(membership.organizationId);

    return { message: 'Employee removed from organization successfully' };
  }

  /**
   * Sync employee count on OrgSubscription.
   * Counts only active, non-departed memberships with EMPLOYEE or ORG_ACCOUNTANT role.
   */
  private async syncEmployeeCount(organizationId: string): Promise<void> {
    try {
      const count = await prisma.orgMembership.count({
        where: {
          organizationId,
          isActive: true,
          leftAt: null,
          role: { in: ['EMPLOYEE', 'ORG_ACCOUNTANT'] },
        },
      });

      await prisma.orgSubscription.updateMany({
        where: { organizationId },
        data: { currentEmployeeCount: count },
      });

      invalidatePlanCache(organizationId);

      log.info({ organizationId, count }, 'Employee count synced');
    } catch (err) {
      log.error({ err, organizationId }, 'Failed to sync employee count');
    }
  }

  /**
   * Generate unique employee ID scoped to the organization via OrgMembership.
   */
  private async generateEmployeeId(organizationId?: string | null): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomNum = randomInt(10000, 99999);
      const employeeId = `EMP-${randomNum}`;

      const existing = await prisma.orgMembership.findFirst({
        where: {
          employeeId,
          ...(organizationId ? { organizationId } : {}),
        },
      });

      if (!existing) return employeeId;
    }

    // Fallback: use crypto random bytes for guaranteed uniqueness
    const { randomBytes } = await import('crypto');
    return `EMP-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate a secure password reset token for new user welcome emails.
   */
  private async generatePasswordResetToken(userId: string): Promise<string> {
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }
}

export const userService = new UserService();