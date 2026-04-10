import crypto, { randomInt } from 'crypto';
import prisma from '../lib/prisma';
import { generateToken, hashToken, getTokenExpiration, JWTPayload } from '../lib/jwt';
import { verifyPassword, hashPassword } from '../lib/password';
import { AuthenticationError } from '../lib/errors';
import { checkLockout, recordFailedAttempt, clearFailedAttempts } from '../lib/lockout';
import { createLogger } from '../logger';
import { LoginInput } from '../schemas/auth.schema';
import { emailService } from './email.service';

const log = createLogger('auth-service');

export class AuthService {
  /**
   * Authenticate user and create session.
   *
   * Flow:
   * 1. Find user by email (platform-level)
   * 2. Verify password
   * 3. For non-SUPER_ADMIN: find active OrgMembership
   * 4. Generate JWT with membership context
   */
  async login(input: LoginInput) {
    await checkLockout(input.email);

    // Step 1: Find user (platform-level fields only)
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        platformId: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      await recordFailedAttempt(input.email);
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is inactive');
    }

    const isValidPassword = await verifyPassword(input.password, user.password);
    if (!isValidPassword) {
      await recordFailedAttempt(input.email);
      throw new AuthenticationError('Invalid email or password');
    }
    await clearFailedAttempts(input.email);

    // Step 2: Resolve membership context
    let membershipId: string | null = null;
    let organizationId: string | null = null;
    let effectiveRole: string = user.role;
    let employeeId: string | null = null;
    let organizationName: string | null = null;

    if (user.role !== 'SUPER_ADMIN') {
      // Non-SUPER_ADMIN must have an active membership to log in
      const membership = await prisma.orgMembership.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          leftAt: null,
          deletedAt: null,
          organization: { isActive: true },
        },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!membership) {
        throw new AuthenticationError('No active organization membership found');
      }

      membershipId = membership.id;
      organizationId = membership.organizationId;
      effectiveRole = membership.role;
      employeeId = membership.employeeId;
      organizationName = membership.organization.name;
    }

    // Step 3: Generate JWT with membership context
    const token = generateToken({
      userId: user.id,
      id: user.id,
      email: user.email,
      role: effectiveRole,
      organizationId,
      membershipId,
    });

    // Step 4: Generate a proper refresh token (random string, stored in DB)
    const refreshToken = crypto.randomBytes(48).toString('hex');

    // Store session with both access and refresh token hashes
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: getTokenExpiration(),
      },
    });

    log.info({ userId: user.id, role: effectiveRole, membershipId, organizationId }, 'User logged in');

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        role: effectiveRole,
        organizationId,
        membershipId,
        employeeId,
        organizationName,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Invalidate session (logout)
   */
  async logout(token: string) {
    const deleted = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { tokenHash: hashToken(token) },
          { refreshTokenHash: hashToken(token) },
        ],
      },
    });

    log.info({ sessionsRemoved: deleted.count }, 'User logged out');
    return { message: 'Logged out successfully' };
  }

  /**
   * Refresh access token using a valid refresh token.
   *
   * Flow:
   * 1. Find session by refreshTokenHash
   * 2. Verify session is valid and not expired
   * 3. Look up user + membership to build a fresh JWT payload
   * 4. Generate a new access token and update the session
   */
  async refreshAccessToken(refreshToken: string) {
    const refreshHash = hashToken(refreshToken);

    // Find session by refresh token hash — use select (not include) for type safety
    const session = await prisma.userSession.findFirst({
      where: {
        refreshTokenHash: refreshHash,
        isValid: true,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            memberships: {
              where: { isActive: true, leftAt: null, deletedAt: null },
              select: {
                id: true,
                role: true,
                organizationId: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!session) {
      throw new AuthenticationError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (!session.user.isActive) {
      await prisma.userSession.update({ where: { id: session.id }, data: { isValid: false } });
      throw new AuthenticationError('Account is inactive');
    }

    // Build JWT payload from current user state
    const membership = session.user.memberships[0] ?? null;
    const effectiveRole = session.user.role === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : (membership?.role ?? session.user.role);

    const newAccessToken = generateToken({
      userId: session.user.id,
      id: session.user.id,
      email: session.user.email,
      role: effectiveRole,
      organizationId: membership?.organizationId ?? null,
      membershipId: membership?.id ?? null,
    });

    // Update session with new access token hash and extend expiry
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(newAccessToken),
        expiresAt: getTokenExpiration(),
      },
    });

    log.info({ userId: session.user.id }, 'Access token refreshed');

    return { accessToken: newAccessToken };
  }

  /**
   * Get current user profile.
   *
   * Returns platform-level user data + active membership details.
   * SUPER_ADMIN gets user data only (no membership).
   */
  async getMe(userId: string, membershipId: string | null) {
    // Platform-level user data
    const user = await prisma.user.findUnique({
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
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user) throw new AuthenticationError('User not found');

    // SUPER_ADMIN: no membership, return user only
    if (user.role === 'SUPER_ADMIN' || !membershipId) {
      return {
        ...user,
        membershipId: null,
        organizationId: null,
        organization: null,
        employeeId: null,
        planFeatures: null,
      };
    }

    // Non-SUPER_ADMIN: fetch membership with org details
    const membership = await prisma.orgMembership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        role: true,
        employeeId: true,
        organizationId: true,
        shiftStartTime: true,
        shiftEndTime: true,
        panNumber: true,
        isActive: true,
        joinedAt: true,
        leftAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            calendarMode: true,
            language: true,
            staticQREnabled: true,
            rotatingQREnabled: true,
            attendanceMode:true,
            geofenceEnabled: true,
          },
        },
      },
    });

    if (!membership) throw new AuthenticationError('Membership not found');

    // Attach effective plan features
    let planFeatures = null;
    if (membership.organizationId) {
      const { getOrgPlan } = await import('./plan.service');
      const plan = await getOrgPlan(membership.organizationId);
      if (plan) {
        planFeatures = {
          isActive: plan.isActive,
          tier: plan.tier,
          featureLeave: plan.featureLeave,
          featureFullPayroll: plan.featureFullPayroll,
          featurePayrollWorkflow: plan.featurePayrollWorkflow,
          featureReports: plan.featureReports,
          featureManualCorrection: plan.featureManualCorrection,
          featureNotifications: plan.featureNotifications,
          featureOnboarding: plan.featureOnboarding,
          featureAuditLog: plan.featureAuditLog,
          featureFileDownload: plan.featureFileDownload,
          featureDownloadReports: plan.featureDownloadReports,
          featureDownloadPayslips: plan.featureDownloadPayslips,
          featureDownloadAuditLog: plan.featureDownloadAuditLog,
          featureDownloadLeaveRecords: plan.featureDownloadLeaveRecords,
        };
      }
    }

    return {
      ...user,
      // Override role with membership role (not the platform-level one)
      role: membership.role,
      membershipId: membership.id,
      employeeId: membership.employeeId,
      organizationId: membership.organizationId,
      organization: membership.organization,
      shiftStartTime: membership.shiftStartTime,
      shiftEndTime: membership.shiftEndTime,
      panNumber: membership.panNumber,
      planFeatures,
    };
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  async cleanExpiredSessions() {
    const deleted = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isValid: false },
        ],
      },
    });
    log.info({ count: deleted.count }, 'Cleaned expired sessions');
    return deleted.count;
  }

  /**
   * Change attendance PIN (self-service — requires current PIN).
   *
   * attendancePinHash now lives on OrgMembership, not User.
   */
  async changeAttendancePin(membershipId: string, currentPin: string, newPin: string) {
    const membership = await prisma.orgMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, attendancePinHash: true, userId: true },
    });
    if (!membership) throw new AuthenticationError('Membership not found');
    if (!membership.attendancePinHash) throw new AuthenticationError('No attendance PIN set. Contact your administrator.');

    const isValid = await verifyPassword(currentPin, membership.attendancePinHash);
    if (!isValid) throw new AuthenticationError('Current PIN is incorrect');

    const newHash = await hashPassword(newPin);
    await prisma.orgMembership.update({
      where: { id: membershipId },
      data: { attendancePinHash: newHash },
    });

    log.info({ membershipId, userId: membership.userId }, 'Attendance PIN changed by employee');
    return { message: 'Attendance PIN changed successfully' };
  }

  /**
   * Request password reset — sends email with token
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      log.info({ email }, 'Password reset requested for unknown/inactive email');
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    // Generate a random token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store token with 1 hour expiry — delete any existing tokens first
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email
    const { sendPasswordResetEmail } = await import('../lib/email');
    await sendPasswordResetEmail(user.email, resetToken);

    log.info({ userId: user.id }, 'Password reset token created');
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!resetRecord) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all sessions for security
    await prisma.userSession.deleteMany({
      where: { userId: resetRecord.userId },
    });

    log.info({ userId: resetRecord.userId }, 'Password reset successfully');
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  /**
   * Change initial password — used when mustChangePassword is true.
   * User is already authenticated; just needs to set their own password.
   */
  async changeInitialPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mustChangePassword: true },
    });

    if (!user) throw new AuthenticationError('User not found');
    if (!user.mustChangePassword) {
      throw new AuthenticationError('Password change is not required');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    log.info({ userId }, 'Initial password changed successfully');
    return { message: 'Password changed successfully.' };
  }

  /**
   * Forgot attendance PIN — generates a new random PIN and emails it.
   * Called by the employee themselves (authenticated).
   */
  async forgotAttendancePin(userId: string, membershipId: string) {
    const membership = await prisma.orgMembership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        userId: true,
        employeeId: true,
        organization: { select: { name: true } },
      },
    });
    if (!membership || membership.userId !== userId) {
      throw new AuthenticationError('Membership not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) throw new AuthenticationError('User not found');

    // Generate new random 4-digit PIN
    const newPin = String(randomInt(1000, 9999 + 1)).padStart(4, '0');
    const newHash = await hashPassword(newPin);

    await prisma.orgMembership.update({
      where: { id: membershipId },
      data: { attendancePinHash: newHash },
    });

    // Send email with new PIN
    emailService.sendPinResetEmail({
      to: user.email,
      firstName: user.firstName,
      employeeId: membership.employeeId || '',
      pin: newPin,
      orgName: membership.organization.name,
    }).catch(err => log.error({ err }, 'Failed to send PIN reset email'));

    log.info({ userId, membershipId }, 'Attendance PIN reset via forgot-pin');
    return { message: 'A new PIN has been sent to your email.' };
  }

  /**
   * Change password (self-service from profile).
   * Requires current password verification.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, password: true },
    });
    if (!user) throw new AuthenticationError('User not found');

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Send confirmation email
    emailService.sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName,
    }).catch(err => log.error({ err }, 'Failed to send password changed email'));

    log.info({ userId }, 'Password changed via profile');
    return { message: 'Password changed successfully.' };
  }
}

export const authService = new AuthService();