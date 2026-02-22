import prisma from '../lib/prisma';
import { hashPassword } from '../lib/password';
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
    const employeeId = await this.generateEmployeeId();
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

    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId! }, select: { name: true } });
      emailService.sendWelcomeEmail({
        to: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeId,
        tempPassword: input.password,
        orgName: org?.name || '',
      }).catch(err => log.error({ err }, 'Failed to send welcome email'));
    } catch (err) { log.error({ err }, 'Failed to send welcome email'); }

    return user;
  }

  /**
   * Update user — with org isolation check
   */
  async updateUser(userId: string, input: UpdateUserInput, currentUser: JWTPayload) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, isActive: true },
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
   * Delete user — with org isolation and self-delete prevention
   */
  async deleteUser(userId: string, currentUser: JWTPayload) {
    if (userId === currentUser.userId) {
      throw new ConflictError('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
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

    await prisma.user.delete({ where: { id: userId } });

    log.info({ userId }, 'User deleted');

    // Sync employee count after deletion
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
          role: "EMPLOYEE",
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
   * Generate unique employee ID
   */
  private async generateEmployeeId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * 90000) + 10000;
      const employeeId = `EMP-${randomNum}`;
      const existing = await prisma.user.findUnique({ where: { employeeId } });
      if (!existing) return employeeId;
      attempts++;
    }

    return `EMP-${Date.now().toString().slice(-5)}`;
  }
}

export const userService = new UserService();