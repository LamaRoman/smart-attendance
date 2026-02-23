import prisma from '../lib/prisma';
import { generateToken, hashToken, getTokenExpiration, JWTPayload } from '../lib/jwt';
import { verifyPassword } from '../lib/password';
import { AuthenticationError } from '../lib/errors';
import { createLogger } from '../logger';
import { LoginInput } from '../schemas/auth.schema';

const log = createLogger('auth-service');


// Account lockout â€” track failed login attempts
const failedAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkLockout(email: string): void {
  const record = failedAttempts.get(email);
  if (record && record.lockedUntil > Date.now()) {
    const mins = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new AuthenticationError('Account locked. Try again in ' + mins + ' minute(s).');
  }
}

function recordFailedAttempt(email: string): void {
  const record = failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION;
    log.warn({ email, attempts: record.count }, 'Account locked after failed attempts');
  }
  failedAttempts.set(email, record);
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

// Cleanup expired lockouts every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of failedAttempts) {
    if (record.lockedUntil < now && record.count > 0) failedAttempts.delete(email);
  }
}, 30 * 60 * 1000);

export class AuthService {
  /**
   * Authenticate user and create session
   */
  async login(input: LoginInput) {
    checkLockout(input.email);

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
      recordFailedAttempt(input.email);
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is inactive');
    }

    const isValidPassword = await verifyPassword(input.password, user.password);
    if (!isValidPassword) {
      recordFailedAttempt(input.email);
      throw new AuthenticationError('Invalid email or password');
    }
    clearFailedAttempts(input.email);

    // Generate JWT with organizationId included
    const token = generateToken({
      userId: user.id,
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
}

export const authService = new AuthService();
