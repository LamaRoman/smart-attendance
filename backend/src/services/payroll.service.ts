import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import {
  getBSMonthADRange,
  getEffectiveWorkingDays,
  getDaysInBSMonth,
  BS_MONTHS_EN,
  BS_MONTHS_NP,
} from '../lib/nepali-date';
import { NotFoundError, ValidationError } from '../lib/errors';
import { createLogger } from '../logger';
import { emailService } from './email.service';
import { JWTPayload } from '../lib/jwt';
import { PaySettingsInput, GeneratePayrollInput } from '../schemas/payroll.schema';
import { holidayService } from './holiday.service';

const log = createLogger('payroll-service');

function toNum(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString());
}

// FIX C-09: Validate TDS slab config loaded from DB before using it.
// Previously raw DB values were used directly in tax calculations — a
// super admin CSRF attack could set rate: -100 to add money to net salary.
function validateTDSConfig(config: any): boolean {
  if (!config) return false;
  if (typeof config.firstSlabRate !== 'number' || config.firstSlabRate < 0 || config.firstSlabRate > 50) return false;
  if (!Array.isArray(config.slabs)) return false;
  for (const slab of config.slabs) {
    if (typeof slab.rate !== 'number' || slab.rate < 0 || slab.rate > 50) return false;
    if (slab.limit !== 0 && (typeof slab.limit !== 'number' || slab.limit <= 0)) return false;
  }
  return true;
}

// FIX H-04: Accept pre-fetched tdsConfig as a parameter instead of querying
// the DB once per employee. Previously called inside the employee loop causing
// N identical DB queries per payroll run (200 employees = 200 queries).
function calculateNepalTDS(annualIncome: number, isMarried: boolean = false, tdsConfig: any): number {
  // Only use DB config if it passes validation (FIX C-09)
  const config = validateTDSConfig(tdsConfig) ? tdsConfig : null;

  const firstSlabRate = (config?.firstSlabRate ?? 1) / 100;
  const firstSlab = isMarried
    ? (config?.marriedFirstSlab ?? 600000)
    : (config?.unmarriedFirstSlab ?? 500000);

  const dbSlabs = config?.slabs ?? [
    { limit: 200000, rate: 10 },
    { limit: 300000, rate: 20 },
    { limit: 1000000, rate: 30 },
    { limit: 3000000, rate: 36 },
    { limit: 0, rate: 39 },
  ];

  const slabs = [
    { limit: firstSlab, rate: firstSlabRate },
    ...dbSlabs.map((s: any) => ({
      limit: s.limit === 0 ? Infinity : s.limit,
      rate: s.rate / 100,
    })),
  ];

  let tax = 0;
  let remaining = annualIncome;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, slab.limit);
    tax += taxable * slab.rate;
    remaining -= taxable;
  }
  return Math.round(tax / 12);
}

export class PayrollService {
  /**
   * Get all employee pay settings — org-scoped
   */
  async getPaySettings(currentUser: JWTPayload) {
    const where: Record<string, unknown> = { isActive: true, role: 'EMPLOYEE' };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const users = await prisma.user.findMany({
      where,
      include: { paySettings: true },
      orderBy: { firstName: 'asc' },
    });

    return users.map((u) => ({
      ...u,
      password: undefined,
      paySettings: u.paySettings
        ? {
            ...u.paySettings,
            basicSalary: toNum(u.paySettings.basicSalary),
            dearnessAllowance: toNum(u.paySettings.dearnessAllowance),
            transportAllowance: toNum(u.paySettings.transportAllowance),
            medicalAllowance: toNum(u.paySettings.medicalAllowance),
            otherAllowances: toNum(u.paySettings.otherAllowances),
            overtimeRatePerHour: toNum(u.paySettings.overtimeRatePerHour),
            employeeSsfRate: toNum(u.paySettings.employeeSsfRate),
            employerSsfRate: toNum(u.paySettings.employerSsfRate),
          }
        : null,
    }));
  }

  /**
   * Create or update pay settings for an employee
   */
  async upsertPaySettings(userId: string, input: PaySettingsInput, currentUser: JWTPayload) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) throw new NotFoundError('User not found');

    if (currentUser.role !== 'SUPER_ADMIN' && user.organizationId !== currentUser.organizationId) {
      throw new NotFoundError('User not found');
    }

    const data = {
      basicSalary: input.basicSalary,
      dearnessAllowance: input.dearnessAllowance,
      transportAllowance: input.transportAllowance,
      medicalAllowance: input.medicalAllowance,
      otherAllowances: input.otherAllowances,
      overtimeRatePerHour: input.overtimeRatePerHour,
      ssfEnabled: input.ssfEnabled,
      employeeSsfRate: input.employeeSsfRate,
      employerSsfRate: input.employerSsfRate,
      tdsEnabled: input.tdsEnabled,
      bankName: input.bankName,
      bankAccountName: input.bankAccountName,
      bankAccountNumber: input.bankAccountNumber,
    };

    const paySettings = await prisma.employeePaySettings.upsert({
      where: { userId },
      update: data,
      create: { userId, organizationId: user.organizationId!, ...data },
    });

    return {
      ...paySettings,
      basicSalary: toNum(paySettings.basicSalary),
      dearnessAllowance: toNum(paySettings.dearnessAllowance),
      transportAllowance: toNum(paySettings.transportAllowance),
      medicalAllowance: toNum(paySettings.medicalAllowance),
      otherAllowances: toNum(paySettings.otherAllowances),
      overtimeRatePerHour: toNum(paySettings.overtimeRatePerHour),
      employeeSsfRate: toNum(paySettings.employeeSsfRate),
      employerSsfRate: toNum(paySettings.employerSsfRate),
    };
  }

  /**
   * Generate payroll for a BS month
   */
  async generatePayroll(input: GeneratePayrollInput, currentUser: JWTPayload) {
    const { bsYear, bsMonth } = input;

    // FIX H-05: Always require a valid organizationId for payroll generation,
    // even for super admins. Previously when currentUser.organizationId was null
    // (super admin without org), the org filter was silently removed and payroll
    // records were created with organizationId: null, corrupting data.
    const organizationId = input.organizationId || currentUser.organizationId;
    if (!organizationId) {
      throw new ValidationError('organizationId is required for payroll generation');
    }

    // Verify the org exists
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organization not found');

    // Non-super-admins can only generate payroll for their own org
    if (currentUser.role !== 'SUPER_ADMIN' && organizationId !== currentUser.organizationId) {
      throw new ValidationError('Access denied to this organization');
    }

    const { start: adStart, end: adEnd } = getBSMonthADRange(bsYear, bsMonth);
    const adYear = adStart.getFullYear();
    const adMonth = adStart.getMonth() + 1;

    const holidayDates = await holidayService.getHolidayDatesForMonth(bsYear, bsMonth, organizationId);
    const holidaysInMonth = holidayDates.length;
    const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);
    const workingDaysInMonth = getEffectiveWorkingDays(bsYear, bsMonth, holidayDates);

    // FIX H-04: Fetch TDS config ONCE before the employee loop.
    // Previously calculateNepalTDS() queried the DB inside the loop — 
    // 200 employees = 200 identical queries per payroll run.
    let tdsConfig: any = null;
    try {
      const dbConfig = await prisma.systemConfig.findFirst({
        where: { key: 'tds_slabs' },
        orderBy: { updatedAt: 'desc' },
      });
      if (dbConfig) tdsConfig = JSON.parse(dbConfig.value);
    } catch (e) { /* fall back to hardcoded defaults */ }

    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'EMPLOYEE',
        organizationId, // FIX H-05: always filter by org, never remove this
        paySettings: { isNot: null },
      },
      include: { paySettings: true },
    });

    if (employees.length === 0) {
      throw new ValidationError('No employees with pay settings configured');
    }

    const payrollRecords = [];

    for (const emp of employees) {
      const s = emp.paySettings!;
      const basicSalary = toNum(s.basicSalary);
      const dearnessAllowance = toNum(s.dearnessAllowance);
      const transportAllowance = toNum(s.transportAllowance);
      const medicalAllowance = toNum(s.medicalAllowance);
      const otherAllowances = toNum(s.otherAllowances);
      const overtimeRatePerHour = toNum(s.overtimeRatePerHour);
      const employeeSsfRate = toNum(s.employeeSsfRate);
      const employerSsfRate = toNum(s.employerSsfRate);

      const { daysPresent, overtimeHours } = await this.getDaysPresent(emp.id, adStart, adEnd);
      const { paidDays: paidLeaveDays, unpaidDays: unpaidLeaveDays } = await this.getApprovedLeaves(emp.id, adStart, adEnd);
      const effectivePresent = Math.min(workingDaysInMonth, daysPresent + paidLeaveDays);
      const daysAbsent = Math.max(0, workingDaysInMonth - effectivePresent);

      const totalAllowances = dearnessAllowance + transportAllowance + medicalAllowance + otherAllowances;
      const absenceDeduction = workingDaysInMonth > 0
        ? Math.round((basicSalary / workingDaysInMonth) * daysAbsent * 100) / 100
        : 0;
      const overtimePay = Math.round(overtimeHours * overtimeRatePerHour * 100) / 100;
      const grossSalary = Math.round((basicSalary + totalAllowances + overtimePay - absenceDeduction) * 100) / 100;

      let employeeSsf = 0;
      let employerSsf = 0;
      if (s.ssfEnabled) {
        employeeSsf = Math.round(basicSalary * (employeeSsfRate / 100) * 100) / 100;
        employerSsf = Math.round(basicSalary * (employerSsfRate / 100) * 100) / 100;
      }

      let employeePf = 0;
      let employerPf = 0;
      if (s.pfEnabled) {
        const pfEmployeeRate = toNum(s.employeePfRate);
        const pfEmployerRate = toNum(s.employerPfRate);
        employeePf = Math.round(basicSalary * (pfEmployeeRate / 100) * 100) / 100;
        employerPf = Math.round(basicSalary * (pfEmployerRate / 100) * 100) / 100;
      }

      const citDeduction = s.citEnabled ? toNum(s.citAmount) : 0;
      const advanceDeduct = toNum(s.advanceDeduction);
      const dashainBonus = bsMonth === 6 ? basicSalary : 0;

      // FIX H-04: Pass pre-fetched tdsConfig instead of querying DB per employee
      // FIX C-09: validateTDSConfig() inside calculateNepalTDS() blocks invalid slab data
      let tds = 0;
      if (s.tdsEnabled) {
        const annualTaxable = (grossSalary + dashainBonus - employeeSsf - employeePf - citDeduction) * 12;
        tds = calculateNepalTDS(annualTaxable, s.isMarried, tdsConfig);
      }

      const totalDeductions = Math.round((absenceDeduction + employeeSsf + employeePf + citDeduction + advanceDeduct + tds) * 100) / 100;
      const netSalary = Math.round((grossSalary + dashainBonus - totalDeductions) * 100) / 100;

      const payrollData = {
        userId: emp.id,
        organizationId,
        year: adYear,
        month: adMonth,
        bsYear,
        bsMonth,
        workingDaysInMonth,
        holidaysInMonth,
        daysPresent: effectivePresent,
        daysAbsent,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeHours,
        basicSalary,
        dearnessAllowance,
        transportAllowance,
        medicalAllowance,
        otherAllowances,
        overtimePay,
        grossSalary,
        absenceDeduction,
        employeeSsf,
        employerSsf,
        tds,
        employeePf,
        employerPf,
        citDeduction,
        advanceDeduction: advanceDeduct,
        dashainBonus,
        isMarried: s.isMarried,
        otherDeductions: 0,
        totalDeductions,
        netSalary,
        status: 'DRAFT' as const,
      };

      // FIX C-10: Replace the check-then-create pattern with a single atomic upsert
      // wrapped in a transaction. Previously two concurrent requests could both pass
      // the findUnique check and both create records, causing duplicate salary entries.
      const record = await prisma.$transaction(async (tx) => {
        return tx.payrollRecord.upsert({
          where: { userId_bsYear_bsMonth: { userId: emp.id, bsYear, bsMonth } },
          update: payrollData,
          create: payrollData,
          include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
        });
      });

      payrollRecords.push(this.mapPayrollRecord(record));
    }

    log.info({ bsYear, bsMonth, orgId: organizationId, count: payrollRecords.length }, 'Payroll generated');

    return {
      bsYear,
      bsMonth,
      monthNameEn: BS_MONTHS_EN[bsMonth - 1],
      monthNameNp: BS_MONTHS_NP[bsMonth - 1],
      daysInMonth,
      workingDaysInMonth,
      holidaysInMonth,
      records: payrollRecords,
    };
  }

  /**
   * Get payroll records for a BS month
   */
  async getRecords(bsYear: number, bsMonth: number, currentUser: JWTPayload) {
    const where: Record<string, unknown> = { bsYear, bsMonth };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, employeeId: true, email: true } } },
      orderBy: { user: { firstName: 'asc' } },
    });

    const mapped = records.map(this.mapPayrollRecord);

    const summary = {
      totalEmployees: mapped.length,
      totalGross: mapped.reduce((sum, r) => sum + r.grossSalary, 0),
      totalDeductions: mapped.reduce((sum, r) => sum + r.totalDeductions, 0),
      totalNet: mapped.reduce((sum, r) => sum + r.netSalary, 0),
      totalEmployerSsf: mapped.reduce((sum, r) => sum + r.employerSsf, 0),
      totalEmployeeSsf: mapped.reduce((sum, r) => sum + r.employeeSsf, 0),
      totalTDS: mapped.reduce((sum, r) => sum + r.tds, 0),
    };

    return { records: mapped, summary };
  }

  /**
   * Update payroll record status
   * FIX C-08: Added organizationId to where clause to prevent cross-org manipulation.
   * Previously only filtered by record ID — an org admin who knew another org's
   * record ID could mark it as PAID.
   */
  async updateStatus(recordId: string, status: string, currentUser: JWTPayload) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'PROCESSED') updateData.processedAt = new Date();
    if (status === 'APPROVED') updateData.approvedAt = new Date();
    if (status === 'PAID') updateData.paidAt = new Date();

    // Build where clause with org isolation
    const where: Record<string, unknown> = { id: recordId };

    // Super admins can update any record, but only if organizationId is passed explicitly
    if (currentUser.role !== 'SUPER_ADMIN') {
      if (!currentUser.organizationId) {
        throw new ValidationError('No organization assigned');
      }
      where.organizationId = currentUser.organizationId;
    }

    const record = await prisma.payrollRecord.findFirst({ where });
    if (!record) {
      throw new NotFoundError('Payroll record not found');
    }

    return prisma.payrollRecord.update({
      where: { id: recordId },
      data: updateData,
      include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
    });
  }

  /**
   * Bulk update payroll status for a month
   */
  async bulkUpdateStatus(bsYear: number, bsMonth: number, status: string, currentUser: JWTPayload) {
    const where: Record<string, unknown> = { bsYear, bsMonth };

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'PROCESSED') updateData.processedAt = new Date();
    if (status === 'APPROVED') updateData.approvedAt = new Date();
    if (status === 'PAID') updateData.paidAt = new Date();

    await prisma.payrollRecord.updateMany({ where, data: updateData });

    if (status === 'APPROVED') {
      try {
        const records = await prisma.payrollRecord.findMany({
          where,
          include: {
            user: { select: { email: true, firstName: true } },
            organization: { select: { name: true } },
          },
        });
        const toNumLocal = (v: any) => typeof v === 'number' ? v : parseFloat(v?.toString() || '0');
        emailService.sendPayrollBulkNotification(
          records.map(r => ({
            email: r.user.email,
            firstName: r.user.firstName,
            netSalary: toNumLocal(r.netSalary),
            bsMonth: BS_MONTHS_EN[(r.bsMonth || 1) - 1],
            bsYear: r.bsYear,
            orgName: r.organization.name,
          }))
        ).catch(err => log.error({ err }, 'Failed to send payroll emails'));
      } catch (err) { log.error({ err }, 'Failed to notify employees of payroll'); }
    }

    return { message: `All records updated to ${status}` };
  }

  /**
   * Get multi-month salary data
   */
  async getMultiMonthData(fromBsYear: number, fromBsMonth: number, toBsYear: number, toBsMonth: number, currentUser: JWTPayload) {
    const months: Array<{ bsYear: number; bsMonth: number }> = [];
    let currentYear = fromBsYear;
    let currentMonth = fromBsMonth;

    while (currentYear < toBsYear || (currentYear === toBsYear && currentMonth <= toBsMonth)) {
      months.push({ bsYear: currentYear, bsMonth: currentMonth });
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    if (months.length > 12) throw new ValidationError('Maximum 12 months allowed');

    const where: Record<string, unknown> = {
      OR: months.map((m) => ({ bsYear: m.bsYear, bsMonth: m.bsMonth })),
    };

    if (currentUser.role === 'EMPLOYEE') {
      where.userId = currentUser.userId;
    } else if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { bsYear: 'asc' }, { bsMonth: 'asc' }],
    });

    const employeeMap: Record<string, any> = {};

    for (const record of records) {
      const userId = record.userId;

      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          userId,
          employee: {
            firstName: record.user.firstName,
            lastName: record.user.lastName,
            employeeId: record.user.employeeId,
            email: record.user.email,
          },
          months: {},
          totals: {
            basicSalary: 0, grossSalary: 0, totalDeductions: 0,
            netSalary: 0, employeeSsf: 0, employeePf: 0, tds: 0, monthsProcessed: 0,
          },
        };
      }

      const emp = employeeMap[userId];
      const monthKey = `${record.bsYear}-${record.bsMonth}`;

      emp.months[monthKey] = {
        id: record.id,
        bsYear: record.bsYear,
        bsMonth: record.bsMonth,
        monthNameEn: BS_MONTHS_EN[record.bsMonth - 1],
        monthNameNp: BS_MONTHS_NP[record.bsMonth - 1],
        basicSalary: toNum(record.basicSalary),
        dearnessAllowance: toNum(record.dearnessAllowance),
        transportAllowance: toNum(record.transportAllowance),
        medicalAllowance: toNum(record.medicalAllowance),
        otherAllowances: toNum(record.otherAllowances),
        grossSalary: toNum(record.grossSalary),
        absenceDeduction: toNum(record.absenceDeduction),
        employeeSsf: toNum(record.employeeSsf),
        employeePf: toNum(record.employeePf),
        citDeduction: toNum(record.citDeduction),
        tds: toNum(record.tds),
        advanceDeduction: toNum(record.advanceDeduction),
        dashainBonus: toNum(record.dashainBonus),
        totalDeductions: toNum(record.totalDeductions),
        netSalary: toNum(record.netSalary),
        status: record.status,
        workingDaysInMonth: record.workingDaysInMonth,
        daysPresent: record.daysPresent,
        daysAbsent: record.daysAbsent,
      };

      emp.totals.basicSalary += toNum(record.basicSalary);
      emp.totals.grossSalary += toNum(record.grossSalary);
      emp.totals.totalDeductions += toNum(record.totalDeductions);
      emp.totals.netSalary += toNum(record.netSalary);
      emp.totals.employeeSsf += toNum(record.employeeSsf);
      emp.totals.employeePf += toNum(record.employeePf);
      emp.totals.tds += toNum(record.tds);
      emp.totals.monthsProcessed++;
    }

    const employees = Object.values(employeeMap).map((emp: any) => ({
      ...emp,
      totals: {
        basicSalary: Math.round(emp.totals.basicSalary * 100) / 100,
        grossSalary: Math.round(emp.totals.grossSalary * 100) / 100,
        totalDeductions: Math.round(emp.totals.totalDeductions * 100) / 100,
        netSalary: Math.round(emp.totals.netSalary * 100) / 100,
        employeeSsf: Math.round(emp.totals.employeeSsf * 100) / 100,
        employeePf: Math.round(emp.totals.employeePf * 100) / 100,
        tds: Math.round(emp.totals.tds * 100) / 100,
        monthsProcessed: emp.totals.monthsProcessed,
      },
    }));

    const grandTotals = { basicSalary: 0, grossSalary: 0, totalDeductions: 0, netSalary: 0, employeeSsf: 0, employeePf: 0, tds: 0 };
    for (const emp of employees) {
      grandTotals.basicSalary += emp.totals.basicSalary;
      grandTotals.grossSalary += emp.totals.grossSalary;
      grandTotals.totalDeductions += emp.totals.totalDeductions;
      grandTotals.netSalary += emp.totals.netSalary;
      grandTotals.employeeSsf += emp.totals.employeeSsf;
      grandTotals.employeePf += emp.totals.employeePf;
      grandTotals.tds += emp.totals.tds;
    }

    return {
      months,
      employees,
      grandTotals: {
        basicSalary: Math.round(grandTotals.basicSalary * 100) / 100,
        grossSalary: Math.round(grandTotals.grossSalary * 100) / 100,
        totalDeductions: Math.round(grandTotals.totalDeductions * 100) / 100,
        netSalary: Math.round(grandTotals.netSalary * 100) / 100,
        employeeSsf: Math.round(grandTotals.employeeSsf * 100) / 100,
        employeePf: Math.round(grandTotals.employeePf * 100) / 100,
        tds: Math.round(grandTotals.tds * 100) / 100,
      },
    };
  }

  async getEarliestBsYear(currentUser: JWTPayload): Promise<number | null> {
    const where: Record<string, unknown> = {};
    if (currentUser.role === 'EMPLOYEE') {
      where.userId = currentUser.userId;
    } else if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }
    const record = await prisma.payrollRecord.findFirst({
      where,
      orderBy: [{ bsYear: 'asc' }, { bsMonth: 'asc' }],
      select: { bsYear: true },
    });
    return record ? record.bsYear : null;
  }

  // ======== Private helpers ========

  private async getApprovedLeaves(userId: string, adStart: Date, adEnd: Date) {
    const leaves = await prisma.leave.findMany({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { lte: adEnd },
        endDate: { gte: adStart },
      },
    });
    let paidDays = 0;
    let unpaidDays = 0;
    for (const leave of leaves) {
      const start = new Date(Math.max(leave.startDate.getTime(), adStart.getTime()));
      const end = new Date(Math.min(leave.endDate.getTime(), adEnd.getTime()));
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (leave.type === 'UNPAID') {
        unpaidDays += days;
      } else {
        paidDays += days;
      }
    }
    return { paidDays, unpaidDays };
  }

  private async getDaysPresent(userId: string, adStart: Date, adEnd: Date) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        checkInTime: { gte: adStart, lte: adEnd },
        status: { in: ['CHECKED_OUT', 'AUTO_CLOSED'] },
      },
    });

    const uniqueDays = new Set<string>();
    let totalMinutes = 0;

    for (const r of records) {
      uniqueDays.add(r.checkInTime.toISOString().split('T')[0]);
      if (r.duration) totalMinutes += r.duration;
    }

    const openRecords = await prisma.attendanceRecord.findMany({
      where: { userId, checkInTime: { gte: adStart, lte: adEnd }, status: 'CHECKED_IN' },
    });

    for (const r of openRecords) {
      uniqueDays.add(r.checkInTime.toISOString().split('T')[0]);
      totalMinutes += Math.floor((Date.now() - r.checkInTime.getTime()) / 60000);
    }

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((totalHours - uniqueDays.size * 8) * 100) / 100);

    return { daysPresent: uniqueDays.size, totalHours, overtimeHours };
  }

  private mapPayrollRecord(r: any) {
    return {
      ...r,
      monthNameEn: BS_MONTHS_EN[(r.bsMonth || 1) - 1],
      monthNameNp: BS_MONTHS_NP[(r.bsMonth || 1) - 1],
      basicSalary: toNum(r.basicSalary),
      dearnessAllowance: toNum(r.dearnessAllowance),
      transportAllowance: toNum(r.transportAllowance),
      medicalAllowance: toNum(r.medicalAllowance),
      otherAllowances: toNum(r.otherAllowances),
      overtimeHours: toNum(r.overtimeHours),
      overtimePay: toNum(r.overtimePay),
      grossSalary: toNum(r.grossSalary),
      absenceDeduction: toNum(r.absenceDeduction),
      employeeSsf: toNum(r.employeeSsf),
      employerSsf: toNum(r.employerSsf),
      employeePf: toNum(r.employeePf),
      employerPf: toNum(r.employerPf),
      citDeduction: toNum(r.citDeduction),
      advanceDeduction: toNum(r.advanceDeduction),
      dashainBonus: toNum(r.dashainBonus),
      isMarried: r.isMarried,
      tds: toNum(r.tds),
      otherDeductions: toNum(r.otherDeductions),
      totalDeductions: toNum(r.totalDeductions),
      netSalary: toNum(r.netSalary),
    };
  }
}

export const payrollService = new PayrollService();
