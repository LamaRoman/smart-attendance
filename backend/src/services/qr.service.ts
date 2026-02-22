import QRCode from 'qrcode';
import prisma from '../lib/prisma';
import { generateQRToken, signQRToken } from '../lib/crypto';
import { config } from '../config';
import { NotFoundError } from '../lib/errors';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';

const log = createLogger('qr-service');

export class QRService {
  /**
   * Generate a new rotating QR code (24h expiry) — revokes existing active codes
   */
  async generate(currentUser: JWTPayload) {
    const organizationId = currentUser.organizationId!;

    // Revoke existing active non-static QR codes for this org
    await prisma.qRCode.updateMany({
      where: { organizationId, status: 'ACTIVE', expiresAt: { not: null } },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    const token = generateQRToken();
    const signature = signQRToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const qrCode = await prisma.qRCode.create({
      data: {
        token,
        signature,
        status: 'ACTIVE',
        expiresAt,
        createdById: currentUser.userId,
        organizationId,
      },
      select: {
        id: true,
        token: true,
        signature: true,
        status: true,
        scanCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const scanUrl = `${config.FRONTEND_URL}/scan?token=${token}&signature=${signature}`;
    const qrImage = await this.generateQRImage(scanUrl);

    log.info({ orgId: organizationId, qrId: qrCode.id }, 'QR code generated (rotating)');

    return { qrCode, scanUrl, qrImage };
  }

  /**
   * Generate a static QR code (no expiry) — for printing and sticking on the wall
   * Only one static QR per org. If one exists, return it.
   */
  async generateStatic(currentUser: JWTPayload) {
    const organizationId = currentUser.organizationId!;

    // Check if a static QR already exists
    const existing = await prisma.qRCode.findFirst({
      where: { organizationId, status: 'ACTIVE', expiresAt: null },
      select: {
        id: true,
        token: true,
        signature: true,
        status: true,
        scanCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (existing) {
      const scanUrl = `${config.FRONTEND_URL}/scan?token=${existing.token}&signature=${existing.signature}`;
      const qrImage = await this.generateQRImage(scanUrl);
      const qrImageLarge = await this.generateQRImageLarge(scanUrl);
      return { qrCode: existing, scanUrl, qrImage, qrImageLarge, isExisting: true };
    }

    const token = generateQRToken();
    const signature = signQRToken(token);

    const qrCode = await prisma.qRCode.create({
      data: {
        token,
        signature,
        status: 'ACTIVE',
        expiresAt: null, // No expiry — permanent
        createdById: currentUser.userId,
        organizationId,
      },
      select: {
        id: true,
        token: true,
        signature: true,
        status: true,
        scanCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const scanUrl = `${config.FRONTEND_URL}/scan?token=${token}&signature=${signature}`;
    const qrImage = await this.generateQRImage(scanUrl);
    const qrImageLarge = await this.generateQRImageLarge(scanUrl);

    log.info({ orgId: organizationId, qrId: qrCode.id }, 'Static QR code generated');

    return { qrCode, scanUrl, qrImage, qrImageLarge, isExisting: false };
  }

  /**
   * Regenerate static QR — revokes old static and creates a new one
   */
  async regenerateStatic(currentUser: JWTPayload) {
    const organizationId = currentUser.organizationId!;

    // Revoke existing static QR
    await prisma.qRCode.updateMany({
      where: { organizationId, status: 'ACTIVE', expiresAt: null },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    log.info({ orgId: organizationId }, 'Old static QR revoked, generating new one');

    // Force generate new
    const token = generateQRToken();
    const signature = signQRToken(token);

    const qrCode = await prisma.qRCode.create({
      data: {
        token,
        signature,
        status: 'ACTIVE',
        expiresAt: null,
        createdById: currentUser.userId,
        organizationId,
      },
      select: {
        id: true,
        token: true,
        signature: true,
        status: true,
        scanCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const scanUrl = `${config.FRONTEND_URL}/scan?token=${token}&signature=${signature}`;
    const qrImage = await this.generateQRImage(scanUrl);
    const qrImageLarge = await this.generateQRImageLarge(scanUrl);

    return { qrCode, scanUrl, qrImage, qrImageLarge, isExisting: false };
  }

  /**
   * Get current active QR code(s) for the org
   */
  async getActive(currentUser: JWTPayload) {
    const organizationId = currentUser.organizationId!;

    const qrCode = await prisma.qRCode.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },          // Static QR — no expiry
          { expiresAt: { gt: new Date() } }, // Rotating QR — not expired
        ],
      },
      select: {
        id: true,
        token: true,
        signature: true,
        status: true,
        scanCount: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!qrCode) {
      throw new NotFoundError('No active QR code found. Generate one first.');
    }

    const scanUrl = `${config.FRONTEND_URL}/scan?token=${qrCode.token}&signature=${qrCode.signature}`;
    const qrImage = await this.generateQRImage(scanUrl);

    return {
      qrCode,
      scanUrl,
      qrImage,
      isStatic: qrCode.expiresAt === null,
    };
  }

  /**
   * Revoke active QR code(s)
   */
  async revoke(currentUser: JWTPayload) {
    const organizationId = currentUser.organizationId!;

    const updated = await prisma.qRCode.updateMany({
      where: { organizationId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    log.info({ orgId: organizationId, count: updated.count }, 'QR codes revoked');

    return { message: `${updated.count} QR code(s) revoked` };
  }

  // Standard size (400px) for display
  private async generateQRImage(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }

  // Large size (800px) for printing
  private async generateQRImageLarge(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      width: 800,
      margin: 3,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }
}

export const qrService = new QRService();
