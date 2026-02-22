import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { verifyToken, hashToken, JWTPayload } from '../lib/jwt';
import { createLogger } from '../logger';

const log = createLogger('auth-middleware');

// Extend Express Request to include authenticated user data
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT token and validate session against DB
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'NO_TOKEN' } });
    }

    // Verify JWT signature and expiry
    const decoded = verifyToken(token);

    // Validate session exists and is still valid in DB
    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.userId,
        tokenHash: hashToken(token),
        isValid: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      log.warn({ userId: decoded.userId }, 'Token valid but session not found or expired');
      return res.status(401).json({ error: { message: 'Session expired or invalid', code: 'INVALID_SESSION' } });
    }

    // Attach user data to request
    req.user = decoded;

    next();
  } catch (error: any) {
    // verifyToken throws AuthenticationError with specific codes
    const code = error?.code || 'AUTH_ERROR';
    const message = error?.message || 'Authentication failed';
    return res.status(401).json({ error: { message, code } });
  }
};

/**
 * Middleware to require SUPER_ADMIN role
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ error: { message: 'Super admin access required' } });
  }

  next();
};

/**
 * Middleware to require ORG_ADMIN or SUPER_ADMIN role
 */
export const requireOrgAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  if (req.user.role !== Role.ORG_ADMIN && req.user.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ error: { message: 'Organization admin access required' } });
  }

  next();
};

/**
 * Middleware to enforce organization data isolation
 * Ensures non-super-admin users can only access their own org's data
 */
export const enforceOrgIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  // Super admin can see all data
  if (req.user.role === Role.SUPER_ADMIN) {
    return next();
  }

  // Everyone else must have an organizationId
  if (!req.user.organizationId) {
    return res.status(403).json({ error: { message: 'No organization assigned' } });
  }

  // Inject organizationId into query and body for downstream use
  req.query.organizationId = req.user.organizationId;

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.body.organizationId = req.user.organizationId;
  }

  // Check if a different orgId was requested (prevent cross-org access)
  const requestedOrgId = req.params.organizationId || req.body.organizationId;
  if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
    log.warn(
      { userId: req.user.userId, requestedOrg: requestedOrgId, userOrg: req.user.organizationId },
      'Cross-org access attempt blocked'
    );
    return res.status(403).json({ error: { message: 'Access denied to this organization' } });
  }

  next();
};

/**
 * Helper: check if current user can access a specific user's data
 */
export const canAccessUser = async (
  currentUser: JWTPayload | undefined,
  targetUserId: string
): Promise<boolean> => {
  if (!currentUser) return false;

  // Super admin can access anyone
  if (currentUser.role === Role.SUPER_ADMIN) return true;

  // Users can access their own data
  if (currentUser.userId === targetUserId) return true;

  // Org admins can access users in their organization
  if (currentUser.role === Role.ORG_ADMIN && currentUser.organizationId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { organizationId: true },
    });
    return targetUser?.organizationId === currentUser.organizationId;
  }

  return false;
};
