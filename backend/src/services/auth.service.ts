import prisma from '../lib/prisma';
import { generateToken, hashToken, getTokenExpiration, JWTPayload } from '../lib/jwt';
import { verifyPassword } from '../lib/password';
import { AuthenticationError } from '../lib/errors';
import { checkLockout, recordFailedAttempt, clearFailedAttempts } from '../lib/lockout';
import { createLogger } from '../logger';
import { LoginInput } from '../schemas/auth.schema';

const log = createLogger('auth-service');

export class AuthService {
  /**
   * Authenticate user and create session
   */
  async login(input: LoginInput) {
    await checkLockout(input.email);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        role: true,
        isActive: true,
        organizationId: true,
        platformId: true,
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

    // Generate JWT with organizationId included
    const token = generateToken({
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    // Store session in DB
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: getTokenExpiration(),
      },
    });

    log.info({ userId: user.id, role: user.role }, 'User logged in');

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Invalidate session (logout)
   */
  async logout(token: string) {
    const deleted = await prisma.userSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });

    log.info({ sessionsRemoved: deleted.count }, 'User logged out');
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        platformId: true,
        role: true,
        isActive: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            calendarMode: true,
            language: true,
            staticQREnabled: true,
            rotatingQREnabled: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) throw new AuthenticationError('User not found');

    // For org users, attach effective plan features
    if (user.organizationId) {
      const { getOrgPlan } = await import('./plan.service');
      const plan = await getOrgPlan(user.organizationId);
      return {
        ...user,
        planFeatures: plan ? {
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
        } : null,
      };
    }

    return user;
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
   * Change attendance PIN (self-service -- requires current PIN)
   */
  async changeAttendancePin(userId: string, currentPin: string, newPin: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, attendancePinHash: true },
    });
    if (!user) throw new AuthenticationError('User not found');
    if (!user.attendancePinHash) throw new AuthenticationError('No attendance PIN set. Contact your administrator.');
    const isValid = await verifyPassword(currentPin, user.attendancePinHash);
    if (!isValid) throw new AuthenticationError('Current PIN is incorrect');
    const { hashPassword } = await import('../lib/password');
    const newHash = await hashPassword(newPin);
    await prisma.user.update({ where: { id: userId }, data: { attendancePinHash: newHash } });
    log.info({ userId }, 'Attendance PIN changed by employee');
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
    const { hashPassword } = await import('../lib/password');
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
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
}

export const authService = new AuthService();

