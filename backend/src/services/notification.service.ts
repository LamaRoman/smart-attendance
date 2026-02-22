import prisma from '../lib/prisma';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';

const log = createLogger('notification-service');

export class NotificationService {
  /**
   * Create a notification
   */
  async create(data: {
    organizationId: string;
    type: string;
    title: string;
    message: string;
    userId?: string;
    attendanceId?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          organizationId: data.organizationId,
          type: data.type as any,
          title: data.title,
          message: data.message,
          userId: data.userId,
          attendanceId: data.attendanceId,
        },
      });

      log.info({ notificationId: notification.id, type: data.type }, 'Notification created');
      return notification;
    } catch (error) {
      log.error({ error, data }, 'Failed to create notification');
      throw error;
    }
  }

  /**
   * Get unread notifications for an organization
   */
  async getUnread(organizationId: string, limit: number = 20) {
    return prisma.notification.findMany({
      where: {
        organizationId,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all notifications for an organization (paginated)
   */
  async getAll(organizationId: string, skip: number = 0, take: number = 50) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where: { organizationId } }),
    ]);

    return { notifications, total };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        organizationId,
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, organizationId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        organizationId, // Ensure org isolation
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(organizationId: string) {
    return prisma.notification.updateMany({
      where: {
        organizationId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, organizationId: string) {
    return prisma.notification.deleteMany({
      where: {
        id: notificationId,
        organizationId, // Ensure org isolation
      },
    });
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(organizationId: string) {
    return prisma.notification.deleteMany({
      where: {
        organizationId,
        isRead: true,
      },
    });
  }

  /**
   * Create late arrival notification
   */
  async createLateArrivalNotification(
    organizationId: string,
    userId: string,
    userName: string,
    minutesLate: number,
    checkInTime: Date,
    attendanceId: string
  ) {
    const title = `Late Arrival: ${userName}`;
    const message = `${userName} arrived ${minutesLate} minutes late at ${checkInTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })}`;

    return this.create({
      organizationId,
      type: 'LATE_ARRIVAL',
      title,
      message,
      userId,
      attendanceId,
    });
  }

  /**
   * Notify organization admins about status change
   */
  async notifyOrgStatusChanged(
    organizationId: string,
    isActive: boolean
  ) {
    try {
      const orgAdmins = await prisma.user.findMany({
        where: {
          organizationId,
          role: 'ORG_ADMIN',
          isActive: true,
        },
      });

      const message = isActive
        ? 'Your organization has been reactivated by the system administrator.'
        : 'Your organization has been deactivated by the system administrator.';

      for (const admin of orgAdmins) {
        await this.create({
          organizationId,
          type: 'ORG_STATUS_CHANGED',
          title: isActive ? 'Organization Activated' : 'Organization Deactivated',
          message,
        });
      }

      log.info({ organizationId, isActive, adminCount: orgAdmins.length }, 'Org status change notified');
    } catch (error) {
      log.error({ error, organizationId }, 'Failed to notify org status change');
    }
  }

  /**
   * Notify ALL organization admins about master holidays update
   */
  async notifyMasterHolidaysUpdated(bsYear: number) {
    try {
      const allOrgs = await prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      const message = `New holidays for BS ${bsYear} are now available. Go to Holidays page to sync with your organization.`;

      for (const org of allOrgs) {
        await this.create({
          organizationId: org.id,
          type: 'MASTER_HOLIDAYS_UPDATED',
          title: `Holidays Updated (BS ${bsYear})`,
          message,
        });
      }

      log.info({ bsYear, orgCount: allOrgs.length }, 'Master holidays update notified to all orgs');
    } catch (error) {
      log.error({ error, bsYear }, 'Failed to notify master holidays update');
    }
  }

  /**
   * Clear master holidays notifications after org syncs
   */
  async clearMasterHolidaysNotification(organizationId: string, bsYear: number) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          organizationId,
          type: 'MASTER_HOLIDAYS_UPDATED',
          message: {
            contains: `BS ${bsYear}`
          },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      log.info({ organizationId, bsYear, count: result.count }, 'Master holidays notifications cleared after sync');
      return result.count;
    } catch (error) {
      log.error({ error, organizationId, bsYear }, 'Failed to clear master holidays notifications');
      return 0;
    }
  }

  /**
   * Clear all late arrival notifications when admin views attendance page
   */
  async clearLateArrivalNotifications(organizationId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          organizationId,
          type: 'LATE_ARRIVAL',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      log.info({ organizationId, count: result.count }, 'Late arrival notifications cleared after viewing attendance');
      return result.count;
    } catch (error) {
      log.error({ error, organizationId }, 'Failed to clear late arrival notifications');
      return 0;
    }
  }

  async deleteOldNotifications() {
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      let totalDeleted = 0;
      for (const org of orgs) {
        const config = await prisma.systemConfig.findUnique({
          where: { organizationId_key: { organizationId: org.id, key: 'notificationRetentionDays' } },
        });
        let retentionDays = config ? parseInt(config.value) : 30;
        retentionDays = Math.min(90, Math.max(7, retentionDays));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await prisma.notification.deleteMany({
          where: { organizationId: org.id, createdAt: { lt: cutoffDate } },
        });
        totalDeleted += result.count;
      }
      log.info({ totalDeleted }, 'Old notifications cleaned up');
      return totalDeleted;
    } catch (error) {
      log.error({ error }, 'Failed to cleanup old notifications');
      return 0;
    }
  }

}
export const notificationService = new NotificationService();
