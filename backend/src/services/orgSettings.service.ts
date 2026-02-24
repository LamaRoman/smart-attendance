import prisma from '../lib/prisma';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';
import { NotFoundError, AuthorizationError } from '../lib/errors';

const log = createLogger('org-settings-service');

export class OrgSettingsService {
  /**
   * Get org settings
   */
  async getSettings(currentUser: JWTPayload) {
    if (!currentUser.organizationId) {
      throw new AuthorizationError('No organization associated');
    }

    const org = await prisma.organization.findUnique({
      where: { id: currentUser.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        calendarMode: true,
        language: true,
        isActive: true,
        geofenceEnabled: true,
        officeLat: true,
        officeLng: true,
        geofenceRadius: true,
        workStartTime: true,
        workEndTime: true,
        lateThresholdMinutes: true,
        workingDays: true,
      },
    });

    if (!org) throw new NotFoundError('Organization not found');

    return org;
  }

  /**
   * Update org settings (language, calendarMode, basic info)
   */
  async updateSettings(
    currentUser: JWTPayload,
    input: {
      language?: 'NEPALI' | 'ENGLISH';
      calendarMode?: 'NEPALI' | 'ENGLISH';
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      geofenceEnabled?: boolean;
      officeLat?: number | null;
      officeLng?: number | null;
      geofenceRadius?: number;
      workStartTime?: string;
      workEndTime?: string;
      lateThresholdMinutes?: number;
    }
  ) {
    if (!currentUser.organizationId) {
      throw new AuthorizationError('No organization associated');
    }

    const data: Record<string, unknown> = {};
    if (input.language) data.language = input.language;
    if (input.calendarMode) data.calendarMode = input.calendarMode;
    if (input.name) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.address !== undefined) data.address = input.address;
    if (input.geofenceEnabled !== undefined) data.geofenceEnabled = input.geofenceEnabled;
    if (input.officeLat !== undefined) data.officeLat = input.officeLat ? Number(input.officeLat) : null;
    if (input.officeLng !== undefined) data.officeLng = input.officeLng ? Number(input.officeLng) : null;
    if (input.geofenceRadius !== undefined) data.geofenceRadius = Number(input.geofenceRadius);
    if (input.workStartTime !== undefined) data.workStartTime = input.workStartTime;
    if (input.workEndTime !== undefined) data.workEndTime = input.workEndTime;
    if (input.lateThresholdMinutes !== undefined) data.lateThresholdMinutes = Number(input.lateThresholdMinutes);

    const org = await prisma.organization.update({
      where: { id: currentUser.organizationId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        calendarMode: true,
        language: true,
        isActive: true,
        geofenceEnabled: true,
        officeLat: true,
        officeLng: true,
        geofenceRadius: true,
        workStartTime: true,
        workEndTime: true,
        lateThresholdMinutes: true,
        workingDays: true,
      },
    });

    log.info({ orgId: org.id, changes: Object.keys(data) }, 'Organization settings updated');

    return org;
  }
}

export const orgSettingsService = new OrgSettingsService();

