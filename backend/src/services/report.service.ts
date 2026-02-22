import prisma from '../lib/prisma';
import { createLogger } from '../logger';
import { JWTPayload } from '../lib/jwt';

const log = createLogger('report-service');

export class ReportService {
  /**
   * Daily attendance report
   */
  async getDailyReport(date: Date, currentUser: JWTPayload) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const employeeWhere: Record<string, unknown> = { isActive: true, role: 'EMPLOYEE' };
    const attendanceWhere: Record<string, unknown> = {
      checkInTime: { gte: startOfDay, lte: endOfDay },
    };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      employeeWhere.organizationId = currentUser.organizationId;
      attendanceWhere.organizationId = currentUser.organizationId;
    }

    const [allEmployees, attendanceRecords] = await Promise.all([
      prisma.user.findMany({
        where: employeeWhere,
        select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: attendanceWhere,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
        orderBy: { checkInTime: 'asc' },
      }),
    ]);

    const presentEmployees = new Set(attendanceRecords.map((r) => r.userId));

    const present = attendanceRecords.map((record) => ({
      employee: record.user,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      duration: record.duration,
      status: record.status,
      checkInMethod: record.checkInMethod,
      checkOutMethod: record.checkOutMethod,
      isActive: record.isActive,
    }));

    const absent = allEmployees.filter((emp) => !presentEmployees.has(emp.id));

    const totalEmployees = allEmployees.length;
    const totalPresent = presentEmployees.size;
    const currentlyClockedIn = attendanceRecords.filter((r) => r.status === 'CHECKED_IN').length;
    const completedShifts = attendanceRecords.filter((r) => r.status === 'CHECKED_OUT').length;

    const totalMinutesWorked = attendanceRecords
      .filter((r) => r.duration !== null)
      .reduce((sum, r) => sum + (r.duration || 0), 0);

    const avgMinutesWorked = completedShifts > 0 ? Math.round(totalMinutesWorked / completedShifts) : 0;

    return {
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalEmployees,
        totalPresent,
        totalAbsent: absent.length,
        currentlyClockedIn,
        completedShifts,
        totalHoursWorked: Math.round((totalMinutesWorked / 60) * 10) / 10,
        avgHoursWorked: Math.round((avgMinutesWorked / 60) * 10) / 10,
        attendanceRate: totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0,
      },
      present,
      absent,
    };
  }

  /**
   * Weekly attendance report
   */
  async getWeeklyReport(startDate: Date, currentUser: JWTPayload) {
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const employeeWhere: Record<string, unknown> = { isActive: true, role: 'EMPLOYEE' };
    const attendanceWhere: Record<string, unknown> = {
      checkInTime: { gte: startDate, lte: endDate },
    };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      employeeWhere.organizationId = currentUser.organizationId;
      attendanceWhere.organizationId = currentUser.organizationId;
    }

    const [allEmployees, attendanceRecords] = await Promise.all([
      prisma.user.findMany({
        where: employeeWhere,
        select: { id: true, firstName: true, lastName: true, employeeId: true },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: attendanceWhere,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
        orderBy: { checkInTime: 'asc' },
      }),
    ]);

    const employeeStats = allEmployees.map((emp) => {
      const empRecords = attendanceRecords.filter((r) => r.userId === emp.id);
      const completedRecords = empRecords.filter((r) => r.duration !== null);
      const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
      const daysPresent = new Set(empRecords.map((r) => r.checkInTime.toISOString().split('T')[0])).size;

      return {
        employee: emp,
        daysPresent,
        totalShifts: empRecords.length,
        completedShifts: completedRecords.length,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgHoursPerDay: daysPresent > 0 ? Math.round((totalMinutes / daysPresent / 60) * 10) / 10 : 0,
      };
    });

    employeeStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    const dailyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];

      const dayRecords = attendanceRecords.filter((r) => r.checkInTime.toISOString().split('T')[0] === dayStr);
      const presentCount = new Set(dayRecords.map((r) => r.userId)).size;
      const totalMinutes = dayRecords.filter((r) => r.duration !== null).reduce((sum, r) => sum + (r.duration || 0), 0);

      dailyBreakdown.push({
        date: dayStr,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        presentCount,
        absentCount: allEmployees.length - presentCount,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      });
    }

    const totalMinutesAll = employeeStats.reduce((sum, e) => sum + e.totalMinutes, 0);
    const totalDaysPresent = employeeStats.reduce((sum, e) => sum + e.daysPresent, 0);
    const withAttendance = employeeStats.filter((e) => e.daysPresent > 0).length;

    return {
      weekStart: startDate.toISOString().split('T')[0],
      weekEnd: endDate.toISOString().split('T')[0],
      summary: {
        totalEmployees: allEmployees.length,
        employeesWithAttendance: withAttendance,
        totalHoursWorked: Math.round((totalMinutesAll / 60) * 10) / 10,
        avgHoursPerEmployee: withAttendance > 0 ? Math.round((totalMinutesAll / withAttendance / 60) * 10) / 10 : 0,
        avgDaysPerEmployee: withAttendance > 0 ? Math.round((totalDaysPresent / withAttendance) * 10) / 10 : 0,
      },
      dailyBreakdown,
      employeeStats,
    };
  }

  /**
   * Monthly attendance report — includes weeklyBreakdown for frontend
   */
  async getMonthlyReport(year: number, month: number, currentUser: JWTPayload) {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const employeeWhere: Record<string, unknown> = { isActive: true, role: 'EMPLOYEE' };
    const attendanceWhere: Record<string, unknown> = {
      checkInTime: { gte: startDate, lte: endDate },
    };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      employeeWhere.organizationId = currentUser.organizationId;
      attendanceWhere.organizationId = currentUser.organizationId;
    }

    const [allEmployees, attendanceRecords] = await Promise.all([
      prisma.user.findMany({
        where: employeeWhere,
        select: { id: true, firstName: true, lastName: true, employeeId: true },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: attendanceWhere,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
        orderBy: { checkInTime: 'asc' },
      }),
    ]);

    // Employee stats
    const employeeStats = allEmployees.map((emp) => {
      const empRecords = attendanceRecords.filter((r) => r.userId === emp.id);
      const completedRecords = empRecords.filter((r) => r.duration !== null);
      const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
      const daysPresent = new Set(empRecords.map((r) => r.checkInTime.toISOString().split('T')[0])).size;

      return {
        employee: emp,
        daysPresent,
        daysAbsent: daysInMonth - daysPresent,
        attendanceRate: Math.round((daysPresent / daysInMonth) * 100),
        totalShifts: empRecords.length,
        completedShifts: completedRecords.length,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgHoursPerDay: daysPresent > 0 ? Math.round((totalMinutes / daysPresent / 60) * 10) / 10 : 0,
      };
    });

    employeeStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Weekly breakdown — split the month into weeks
    const weeklyBreakdown = this.computeWeeklyBreakdown(startDate, endDate, allEmployees, attendanceRecords);

    const totalMinutesAll = employeeStats.reduce((sum, e) => sum + e.totalMinutes, 0);
    const totalDaysPresent = employeeStats.reduce((sum, e) => sum + e.daysPresent, 0);
    const withAttendance = employeeStats.filter((e) => e.daysPresent > 0).length;
    const avgAttendanceRate = employeeStats.length > 0
      ? Math.round(employeeStats.reduce((sum, e) => sum + e.attendanceRate, 0) / employeeStats.length)
      : 0;

    return {
      year,
      month,
      monthName: startDate.toLocaleDateString('en-US', { month: 'long' }),
      daysInMonth,
      summary: {
        totalEmployees: allEmployees.length,
        employeesWithAttendance: withAttendance,
        totalHoursWorked: Math.round((totalMinutesAll / 60) * 10) / 10,
        avgHoursPerEmployee: withAttendance > 0 ? Math.round((totalMinutesAll / withAttendance / 60) * 10) / 10 : 0,
        avgDaysPerEmployee: withAttendance > 0 ? Math.round((totalDaysPresent / withAttendance) * 10) / 10 : 0,
        avgAttendanceRate,
      },
      weeklyBreakdown,
      employeeStats,
    };
  }

  // ======== Private helpers ========

  private computeWeeklyBreakdown(
    monthStart: Date,
    monthEnd: Date,
    allEmployees: Array<{ id: string }>,
    attendanceRecords: Array<{ userId: string; checkInTime: Date; duration: number | null }>
  ) {
    const weeks: Array<{
      week: number;
      startDate: string;
      endDate: string;
      employeesPresent: number;
      totalHours: number;
    }> = [];

    let weekNum = 1;
    let current = new Date(monthStart);

    while (current <= monthEnd) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Clamp to month boundaries
      if (weekEnd > monthEnd) {
        weekEnd.setTime(monthEnd.getTime());
      }

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Filter records for this week
      const weekRecords = attendanceRecords.filter((r) => {
        const recordDate = r.checkInTime.toISOString().split('T')[0];
        return recordDate >= weekStartStr && recordDate <= weekEndStr;
      });

      const employeesPresent = new Set(weekRecords.map((r) => r.userId)).size;
      const totalMinutes = weekRecords
        .filter((r) => r.duration !== null)
        .reduce((sum, r) => sum + (r.duration || 0), 0);

      weeks.push({
        week: weekNum,
        startDate: weekStartStr,
        endDate: weekEndStr,
        employeesPresent,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      });

      // Move to next week
      current.setDate(current.getDate() + 7);
      weekNum++;
    }

    return weeks;
  }
}

export const reportService = new ReportService();
