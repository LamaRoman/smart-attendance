import prisma from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { randomInt } from 'crypto'; // FIX H-11: use crypto.randomInt instead of Math.random()
import { NotFoundError, ConflictError } from '../lib/errors';
import { createLogger } from '../logger';
import { emailService } from './email.service';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import { JWTPayload } from '../lib/jwt';
import { generatePlatformId } from '../utils/platformId';
import { invalidatePlanCache } from './plan.service';

const log = createLogger('user-service');

// Fields to return (never return password)
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  employeeId: true,
  platformId: true,
  phone: true,
  role: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserService {

  /**
   * List users — scoped to organization
   */
  async listUsers(currentUser: JWTPayload) {
    const where: Record<string, unknown> = {};

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    return prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create user — assigned to current user's organization
   */
  async createUser(input: CreateUserInput, currentUser: JWTPayload) {
    if ((input as any).role === 'SUPER_ADMIN') {
      throw new ConflictError('Cannot create super admin accounts');
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await hashPassword(input.password);
    const employeeId = await this.generateEmployeeId(currentUser.organizationId);
    const platformId = await generatePlatformId();
    const organizationId = currentUser.organizationId;

    if (!organizationId && currentUser.role !== 'SUPER_ADMIN') {
      throw new Error('No organization assigned to current user');
    }

    // ── Employee cap check ────────────────────────────────────
    // Super admin bypasses cap — they can always create users
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
    // ─────────────────────────────────────────────────────────

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        employeeId,
        platformId,
        role: input.role,
        shiftStartTime: input.shiftStartTime || null,
        shiftEndTime: input.shiftEndTime || null,
        isActive: true,
        organizationId,
      },
      select: USER_SELECT,
    });

    log.info({ userId: user.id, email: user.email, orgId: organizationId }, 'User created');

    // Sync employee count after creation
    if (organizationId) {
      await this.syncEmployeeCount(organizationId);
    }

    // FIX C-12: Never send the plaintext password in email.
    // Instead send a password-reset link so the employee sets their own password.
    // The admin-typed password is already hashed and stored — it is NOT sent.
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId! },
        select: { name: true },
      });

      // Generate a secure password-reset token valid for 24 hours
      const resetToken = await this.generatePasswordResetToken(user.id);

      emailService.sendWelcomeEmail({
        to: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeId,
        // Pass a reset link instead of the plaintext password
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        orgName: org?.name || '',
      }).catch(err => log.error({ err }, 'Failed to send welcome email'));
    } catch (err) {
      log.error({ err }, 'Failed to send welcome email');
    }

    return user;
  }

  /**
   * Update user — with org isolation check and last-admin guard
   */
  async updateUser(userId: string, input: UpdateUserInput, currentUser: JWTPayload) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, isActive: true, role: true },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      existingUser.organizationId !== currentUser.organizationId
    ) {
      throw new NotFoundError('User not found');
    }

    // FIX C-13: Before downgrading an ORG_ADMIN to EMPLOYEE, ensure at least
    // one other ORG_ADMIN remains in the org. Without this check, an org can
    // end up with zero admins — making payroll, leave approval, and user
    // management permanently inaccessible.
    if (
      input.role &&
      input.role !== 'ORG_ADMIN' &&
      existingUser.role === 'ORG_ADMIN' &&
      existingUser.organizationId
    ) {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: existingUser.organizationId,
          role: 'ORG_ADMIN',
          isActive: true,
          id: { not: userId }, // exclude the user being demoted
        },
      });

      if (adminCount < 1) {
        throw new ConflictError(
          'Cannot demote this admin — they are the last admin in the organization. Assign another admin first.'
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.email) updateData.email = input.email;
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.role) updateData.role = input.role;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.shiftStartTime !== undefined) updateData.shiftStartTime = input.shiftStartTime || null;
    if (input.shiftEndTime !== undefined) updateData.shiftEndTime = input.shiftEndTime || null;
    if (input.password) {
      updateData.password = await hashPassword(input.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });

    log.info({ userId, updatedFields: Object.keys(updateData) }, 'User updated');

    // Sync employee count if active status changed — affects billing
    const activeStatusChanged = input.isActive !== undefined && input.isActive !== existingUser.isActive;
    if (activeStatusChanged && existingUser.organizationId) {
      await this.syncEmployeeCount(existingUser.organizationId);
    }

    return user;
  }

  /**
   * Delete user — soft delete with org isolation, self-delete prevention, and last-admin guard
   */
  async deleteUser(userId: string, currentUser: JWTPayload) {
    if (userId === currentUser.userId) {
      throw new ConflictError('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, role: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      user.organizationId !== currentUser.organizationId
    ) {
      throw new NotFoundError('User not found');
    }

    // FIX H-12: Last-admin guard on deletion — same logic as updateUser demotion.
    // Without this, deleting the last admin locks the org out of all admin functions.
    if (user.role === 'ORG_ADMIN' && user.organizationId) {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: 'ORG_ADMIN',
          isActive: true,
          id: { not: userId },
        },
      });

      if (adminCount < 1) {
        throw new ConflictError(
          'Cannot delete this admin — they are the last admin in the organization. Assign another admin first.'
        );
      }
    }

    // FIX H-10: Soft delete instead of hard delete.
    // Hard deleting a user cascades and permanently removes payroll records,
    // attendance history, leave records, and audit logs — violating legal
    // data retention requirements for financial records.
    // Instead: deactivate the account and record the deletion timestamp.
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        // Anonymize PII while preserving financial/attendance record integrity
        email: `deleted_${userId}@deleted.invalid`,
      },
    });

    log.info({ userId, deletedBy: currentUser.userId }, 'User soft-deleted');

    // Sync employee count after soft-deletion
    if (user.organizationId) {
      await this.syncEmployeeCount(user.organizationId);
    }

    return { message: 'User deleted successfully' };
  }

  /**
   * Sync employee count on OrgSubscription.
   * Counts only active, non-super-admin users in the org.
   * Called after create, delete, and isActive changes.
   * Also invalidates plan cache so billing reflects the new count immediately.
   */
  private async syncEmployeeCount(organizationId: string): Promise<void> {
    try {
      const count = await prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          role: 'EMPLOYEE',
        },
      });

      await prisma.orgSubscription.updateMany({
        where: { organizationId },
        data: { currentEmployeeCount: count },
      });

      invalidatePlanCache(organizationId);

      log.info({ organizationId, count }, 'Employee count synced');
    } catch (err) {
      // Non-fatal — log and continue. Never block user operations for a count sync failure.
      log.error({ err, organizationId }, 'Failed to sync employee count');
    }
  }

  /**
   * Generate unique employee ID scoped to the organization.
   * FIX H-11: Use crypto.randomInt() instead of Math.random() for
   * cryptographically secure IDs. Also scope uniqueness check to org,
   * not platform-wide, to allow the same number across different orgs.
   */
  private async generateEmployeeId(organizationId?: string | null): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomNum = randomInt(10000, 99999); // cryptographically secure
      const employeeId = `EMP-${randomNum}`;

      const existing = await prisma.user.findFirst({
        where: {
          employeeId,
          // Scope to org if available — different orgs can share the same number
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
   * FIX C-12: Used instead of sending plaintext passwords.
   * Token expires in 24 hours.
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
