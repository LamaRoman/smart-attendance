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

function calculateNepalTDS(
  annualIncome: number,
  isMarried: boolean = false,
  tdsConfig: any,
  ssfEnabled: boolean = false,
): number {
  const config = validateTDSConfig(tdsConfig) ? tdsConfig : null;

  // SSF contributors are exempt from 1% Social Security Tax
  // per Section 21(4) of Nepal's Financial Act
  const firstSlabRate = ssfEnabled ? 0 : (config?.firstSlabRate ?? 1) / 100;

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

/**
 * Helper: flatten membership.user into a flat user-like object for response compatibility.
 * PayrollRecord includes { membership: { employeeId, user: { firstName, lastName, email } } }
 * We flatten to { user: { firstName, lastName, employeeId, email } } for backward compat.
 */
function flattenRecordUser(record: any) {
  if (!record.membership) return record;
  const { membership, ...rest } = record;
  return {
    ...rest,
    membershipId: membership.id ?? record.membershipId,
    user: {
      firstName: membership.user?.firstName,
      lastName: membership.user?.lastName,
      email: membership.user?.email,
      employeeId: membership.employeeId,
    },
  };
}

// Standard include for payroll record queries
const PAYROLL_RECORD_INCLUDE = {
  membership: {
    select: {
      id: true,
      employeeId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} as const;

export class PayrollService {

  // ======== Audit logging ========

  async logPayrollAudit(data: {
    organizationId: string;
    payrollRecordId?: string;
    employeeUserId?: string;
    action: 'GENERATED' | 'REGENERATED' | 'STATUS_CHANGED' | 'FLAGGED_NEEDS_RECALCULATION' | 'VOIDED';
    fromStatus?: string;
    toStatus?: string;
    triggeredBy: string;
    triggeredByName?: string;
    reason?: string;
    attendanceRecordId?: string;
    bsYear?: number;
    bsMonth?: number;
  }) {
    try {
      await prisma.payrollAuditLog.create({ data });
    } catch (err) {
      log.error({ err, data }, 'Failed to write payroll audit log');
    }
  }

  // ======== Pay settings ========

  async getPaySettings(currentUser: JWTPayload) {
    const where: Record<string, unknown> = {
      isActive: true,
      leftAt: null,
      role: 'EMPLOYEE',
    };
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const memberships = await prisma.orgMembership.findMany({
      where,
      include: {
        paySettings: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            platformId: true,
          },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    return memberships.map((m) => ({
      // Flatten to match old response shape
      id: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      phone: m.user.phone,
      platformId: m.user.platformId,
      membershipId: m.id,
      role: m.role,
      employeeId: m.employeeId,
      isActive: m.isActive,
      organizationId: m.organizationId,
      password: undefined,
      paySettings: m.paySettings
        ? {
          ...m.paySettings,
          basicSalary: toNum(m.paySettings.basicSalary),
          dearnessAllowance: toNum(m.paySettings.dearnessAllowance),
          transportAllowance: toNum(m.paySettings.transportAllowance),
          medicalAllowance: toNum(m.paySettings.medicalAllowance),
          otherAllowances: toNum(m.paySettings.otherAllowances),
          overtimeRatePerHour: toNum(m.paySettings.overtimeRatePerHour),
          employeeSsfRate: toNum(m.paySettings.employeeSsfRate),
          employerSsfRate: toNum(m.paySettings.employerSsfRate),
          employeePfRate: toNum(m.paySettings.employeePfRate),
          employerPfRate: toNum(m.paySettings.employerPfRate),
          citAmount: toNum(m.paySettings.citAmount),
          advanceDeduction: toNum(m.paySettings.advanceDeduction),
        }
        : null,
    }));
  }

  async upsertPaySettings(userId: string, input: PaySettingsInput, currentUser: JWTPayload) {
    // Find membership by userId + org
    const organizationId = currentUser.organizationId;
    if (!organizationId && currentUser.role !== 'SUPER_ADMIN') {
      throw new ValidationError('No organization context');
    }

    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: { id: true, organizationId: true },
    });

    if (!membership) throw new NotFoundError('User not found in your organization');

    if (currentUser.role !== 'SUPER_ADMIN' && membership.organizationId !== currentUser.organizationId) {
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
      where: { membershipId: membership.id },
      update: data,
      create: { membershipId: membership.id, organizationId: membership.organizationId, ...data },
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

  // ======== Core payroll calculation ========

  private async calculateEmployeePayroll(
    membership: any,
    organizationId: string,
    bsYear: number,
    bsMonth: number,
    adStart: Date,
    adEnd: Date,
    workingDaysInMonth: number,
    holidaysInMonth: number,
    tdsConfig: any
  ) {
    const adYear = adStart.getFullYear();
    const adMonth = adStart.getMonth() + 1;
    const s = membership.paySettings!;
    const basicSalary = toNum(s.basicSalary);
    const dearnessAllowance = toNum(s.dearnessAllowance);
    const transportAllowance = toNum(s.transportAllowance);
    const medicalAllowance = toNum(s.medicalAllowance);
    const otherAllowances = toNum(s.otherAllowances);
    const overtimeRatePerHour = toNum(s.overtimeRatePerHour);
    const employeeSsfRate = toNum(s.employeeSsfRate);
    const employerSsfRate = toNum(s.employerSsfRate);

    const { daysPresent, overtimeHours } = await this.getDaysPresent(membership.id, adStart, adEnd);
    const { paidDays: paidLeaveDays, unpaidDays: unpaidLeaveDays } = await this.getApprovedLeaves(membership.id, adStart, adEnd);
    const effectivePresent = Math.min(workingDaysInMonth, daysPresent + paidLeaveDays);

    // Zero attendance = no salary
    if (effectivePresent === 0) {
      return {
        membershipId: membership.id,
        organizationId,
        year: adYear,
        month: adMonth,
        bsYear,
        bsMonth,
        workingDaysInMonth,
        holidaysInMonth,
        daysPresent: 0,
        daysAbsent: workingDaysInMonth,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeHours: 0,
        basicSalary,
        dearnessAllowance,
        transportAllowance,
        medicalAllowance,
        otherAllowances,
        overtimePay: 0,
        grossSalary: 0,
        absenceDeduction: 0,
        employeeSsf: 0,
        employerSsf: 0,
        tds: 0,
        employeePf: 0,
        employerPf: 0,
        citDeduction: 0,
        advanceDeduction: 0,
        dashainBonus: 0,
        isMarried: s.isMarried,
        otherDeductions: 0,
        totalDeductions: 0,
        netSalary: 0,
      };
    }

    // ─────────────────────────────────────────────────────────
    // REPLACE lines 313–348 in payroll.service.ts with this block
    // (everything from "const daysAbsent =" through "const netSalary =")
    // The "return {" block after this stays unchanged.
    // ─────────────────────────────────────────────────────────

    const daysAbsent = Math.max(0, workingDaysInMonth - effectivePresent);
    const totalAllowances = dearnessAllowance + transportAllowance + medicalAllowance + otherAllowances;

    // Nepal payroll standard: fixed 30-day divisor for monthly salaried employees.
    // This keeps deductions consistent across months (28–31 days) and aligns with
    // Nepal Labour Act practice and SSF guidelines from the Ministry of Labour.
    const MONTHLY_DIVISOR = 30;
    const dailyRate = Math.round((basicSalary / MONTHLY_DIVISOR) * 100) / 100;
    const absenceDeduction = Math.round(dailyRate * daysAbsent * 100) / 100;

    const overtimePay = Math.round(overtimeHours * overtimeRatePerHour * 100) / 100;
    const grossSalary = Math.round((basicSalary + totalAllowances + overtimePay - absenceDeduction) * 100) / 100;

    // Effective basic = basic salary actually paid after absence deduction.
    // Per Nepal's SSF Act, contribution is on "the basic wage the worker receives".
    // SSF is calculated on the adjusted basic, not the contractual/paper salary.
    const effectiveBasic = Math.max(0, Math.round((basicSalary - absenceDeduction) * 100) / 100);

    // If effective earnings are zero or negative, no SSF/PF/TDS/CIT applies
    const hasEffectiveEarnings = grossSalary > 0;

    let employeeSsf = 0;
    let employerSsf = 0;
    if (s.ssfEnabled && hasEffectiveEarnings) {
      employeeSsf = Math.round(effectiveBasic * (employeeSsfRate / 100) * 100) / 100;
      employerSsf = Math.round(effectiveBasic * (employerSsfRate / 100) * 100) / 100;
    }

    let employeePf = 0;
    let employerPf = 0;
    if (s.pfEnabled && hasEffectiveEarnings) {
      const pfEmployeeRate = toNum(s.employeePfRate);
      const pfEmployerRate = toNum(s.employerPfRate);
      employeePf = Math.round(effectiveBasic * (pfEmployeeRate / 100) * 100) / 100;
      employerPf = Math.round(effectiveBasic * (pfEmployerRate / 100) * 100) / 100;
    }

    // CIT and advance: only apply when there are actual earnings
    const citDeduction = (s.citEnabled && hasEffectiveEarnings) ? toNum(s.citAmount) : 0;
    const advanceDeduct = hasEffectiveEarnings ? toNum(s.advanceDeduction) : 0;

    const dashainBonus = bsMonth === 6 ? basicSalary : 0;

    let tds = 0;
    if (s.tdsEnabled && hasEffectiveEarnings) {
      const annualTaxable = (grossSalary + dashainBonus - employeeSsf - employeePf - citDeduction) * 12;
      tds = calculateNepalTDS(annualTaxable, s.isMarried, tdsConfig, s.ssfEnabled);
    }

    // Total deductions capped so net salary never goes negative
    const rawTotalDeductions = Math.round((absenceDeduction + employeeSsf + employeePf + citDeduction + advanceDeduct + tds) * 100) / 100;
    const totalDeductions = Math.min(rawTotalDeductions, grossSalary + dashainBonus);
    const netSalary = Math.max(0, Math.round((grossSalary + dashainBonus - totalDeductions) * 100) / 100);
    return {
      membershipId: membership.id,
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
    };
  }

  // ======== Generate payroll ========

  async generatePayroll(input: GeneratePayrollInput, currentUser: JWTPayload) {
    const { bsYear, bsMonth } = input;

    const organizationId = input.organizationId || currentUser.organizationId;
    if (!organizationId) {
      throw new ValidationError('organizationId is required for payroll generation');
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organization not found');

    if (currentUser.role !== 'SUPER_ADMIN' && organizationId !== currentUser.organizationId) {
      throw new ValidationError('Access denied to this organization');
    }

    const { start: adStart, end: adEnd } = getBSMonthADRange(bsYear, bsMonth);
    const holidayDates = await holidayService.getHolidayDatesForMonth(bsYear, bsMonth, organizationId);
    const holidaysInMonth = holidayDates.length;
    const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);
    const workingDaysInMonth = getEffectiveWorkingDays(bsYear, bsMonth, holidayDates);

    let tdsConfig: any = null;
    try {
      const dbConfig = await prisma.systemConfig.findFirst({
        where: { key: 'tds_slabs' },
        orderBy: { updatedAt: 'desc' },
      });
      if (dbConfig) tdsConfig = JSON.parse(dbConfig.value);
    } catch (e) { /* fall back to defaults */ }

    // Query active memberships with pay settings
    const memberships = await prisma.orgMembership.findMany({
      where: {
        isActive: true,
        leftAt: null,
        role: 'EMPLOYEE',
        organizationId,
        paySettings: { isNot: null },
      },
      include: {
        paySettings: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (memberships.length === 0) {
      throw new ValidationError('No employees with pay settings configured');
    }

    const payrollRecords = [];

    for (const membership of memberships) {
      const payrollData = await this.calculateEmployeePayroll(
        membership, organizationId, bsYear, bsMonth,
        adStart, adEnd, workingDaysInMonth, holidaysInMonth, tdsConfig
      );

      // Skip zero attendance
      if (payrollData.daysPresent === 0 && payrollData.overtimeHours === 0) {
        log.info({ membershipId: membership.id, bsYear, bsMonth }, 'Skipping payroll — zero attendance');
        continue;
      }

      const record = await prisma.$transaction(async (tx) => {
        const existing = await tx.payrollRecord.findUnique({
          where: { membershipId_bsYear_bsMonth: { membershipId: membership.id, bsYear, bsMonth } },
          select: { status: true },
        });

        const result = await tx.payrollRecord.upsert({
          where: { membershipId_bsYear_bsMonth: { membershipId: membership.id, bsYear, bsMonth } },
          update: { ...payrollData, status: 'DRAFT' },
          create: { ...payrollData, status: 'DRAFT' },
          include: PAYROLL_RECORD_INCLUDE,
        });

        return { result, previousStatus: existing?.status };
      });

      // Audit log (employeeUserId stays as userId for auditability)
      this.logPayrollAudit({
        organizationId,
        payrollRecordId: record.result.id,
        employeeUserId: membership.user.id,
        action: 'GENERATED',
        fromStatus: record.previousStatus,
        toStatus: 'DRAFT',
        triggeredBy: currentUser.userId,
        bsYear,
        bsMonth,
      });

      payrollRecords.push(this.mapPayrollRecord(flattenRecordUser(record.result)));
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

  // ======== Regenerate for single employee ========

  async regenerateForEmployee(
    userId: string,
    bsYear: number,
    bsMonth: number,
    reason: string,
    currentUser: JWTPayload
  ) {
    const organizationId = currentUser.organizationId;
    if (!organizationId) {
      throw new ValidationError('Organization context required');
    }

    // Resolve userId to membership
    const membership = await prisma.orgMembership.findFirst({
      where: { userId, organizationId, isActive: true, role: 'EMPLOYEE' },
      include: { paySettings: true, user: { select: { id: true } } },
    });

    if (!membership) throw new NotFoundError('Employee not found');
    if (!membership.paySettings) throw new ValidationError('Employee has no pay settings configured');

    const existing = await prisma.payrollRecord.findUnique({
      where: { membershipId_bsYear_bsMonth: { membershipId: membership.id, bsYear, bsMonth } },
      select: { id: true, status: true },
    });

    if (existing && (existing.status === 'APPROVED' || existing.status === 'PAID')) {
      throw new ValidationError(
        `Cannot regenerate a payslip with status ${existing.status}. Void it first.`,
        'PAYROLL_LOCKED'
      );
    }

    const { start: adStart, end: adEnd } = getBSMonthADRange(bsYear, bsMonth);
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organization not found');

    const holidayDates = await holidayService.getHolidayDatesForMonth(bsYear, bsMonth, organizationId);
    const holidaysInMonth = holidayDates.length;
    const workingDaysInMonth = getEffectiveWorkingDays(bsYear, bsMonth, holidayDates);

    let tdsConfig: any = null;
    try {
      const dbConfig = await prisma.systemConfig.findFirst({
        where: { key: 'tds_slabs' },
        orderBy: { updatedAt: 'desc' },
      });
      if (dbConfig) tdsConfig = JSON.parse(dbConfig.value);
    } catch (e) { /* fall back to defaults */ }

    const payrollData = await this.calculateEmployeePayroll(
      membership, organizationId, bsYear, bsMonth,
      adStart, adEnd, workingDaysInMonth, holidaysInMonth, tdsConfig
    );

    const record = await prisma.$transaction(async (tx) => {
      return tx.payrollRecord.upsert({
        where: { membershipId_bsYear_bsMonth: { membershipId: membership.id, bsYear, bsMonth } },
        update: { ...payrollData, status: 'DRAFT' },
        create: { ...payrollData, status: 'DRAFT' },
        include: PAYROLL_RECORD_INCLUDE,
      });
    });

    await this.logPayrollAudit({
      organizationId,
      payrollRecordId: record.id,
      employeeUserId: userId,
      action: 'REGENERATED',
      fromStatus: existing?.status,
      toStatus: 'DRAFT',
      triggeredBy: currentUser.userId,
      reason,
      bsYear,
      bsMonth,
    });

    log.info({
      membershipId: membership.id, bsYear, bsMonth, orgId: organizationId, reason
    }, 'Payroll regenerated for single employee');

    return this.mapPayrollRecord(flattenRecordUser(record));
  }

  // ======== Get records ========

  async getRecords(bsYear: number, bsMonth: number, currentUser: JWTPayload) {
    const where: Record<string, unknown> = { bsYear, bsMonth };
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }
    const records = await prisma.payrollRecord.findMany({
      where,
      include: PAYROLL_RECORD_INCLUDE,
      orderBy: { membership: { user: { firstName: 'asc' } } },
    });
    const mapped = records.map(r => this.mapPayrollRecord(flattenRecordUser(r)));
    const summary = {
      totalEmployees: mapped.length,
      totalGross: mapped.reduce((sum, r) => sum + r.grossSalary, 0),
      totalDeductions: mapped.reduce((sum, r) => sum + r.totalDeductions, 0),
      totalNet: mapped.reduce((sum, r) => sum + r.netSalary, 0),
      totalEmployerSsf: mapped.reduce((sum, r) => sum + r.employerSsf, 0),
      totalEmployeeSsf: mapped.reduce((sum, r) => sum + r.employeeSsf, 0),
      totalTDS: mapped.reduce((sum, r) => sum + r.tds, 0),
      needsRecalculation: mapped.filter(r => r.status === 'NEEDS_RECALCULATION').length,
    };
    return { records: mapped, summary };
  }

  async getAuditLog(payrollRecordId: string, currentUser: JWTPayload) {
    const record = await prisma.payrollRecord.findFirst({
      where: {
        id: payrollRecordId,
        ...(currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId ? { organizationId: currentUser.organizationId } : {}),
      },
    });
    if (!record) throw new NotFoundError('Payroll record not found');

    return prisma.payrollAuditLog.findMany({
      where: { payrollRecordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ======== Status updates ========

  async updateStatus(recordId: string, status: string, currentUser: JWTPayload) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'PROCESSED') updateData.processedAt = new Date();
    if (status === 'APPROVED') updateData.approvedAt = new Date();
    if (status === 'PAID') updateData.paidAt = new Date();

    const where: Record<string, unknown> = { id: recordId };
    if (currentUser.role !== 'SUPER_ADMIN') {
      if (!currentUser.organizationId) throw new ValidationError('No organization assigned');
      where.organizationId = currentUser.organizationId;
    }

    const record = await prisma.payrollRecord.findFirst({
      where,
      include: { membership: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundError('Payroll record not found');

    if (record.status === 'NEEDS_RECALCULATION' && status !== 'NEEDS_RECALCULATION') {
      throw new ValidationError(
        'This payslip has attendance corrections and must be regenerated before changing status.',
        'NEEDS_RECALCULATION'
      );
    }

    if (record.status === 'PAID') {
      throw new ValidationError(
        'Paid payroll records cannot be modified. Corrections must be applied in the next payroll period.'
      );
    }

    const ROLE_TRANSITIONS: Record<string, Record<string, string[]>> = {
      ORG_ACCOUNTANT: {
        DRAFT: ['PROCESSED'],
        APPROVED: ['PAID'],
      },
      ORG_ADMIN: {
        DRAFT: ['PROCESSED'],
        PROCESSED: ['APPROVED'],
        APPROVED: ['PROCESSED', 'PAID'],
      },
      SUPER_ADMIN: {
        DRAFT: ['PROCESSED'],
        PROCESSED: ['APPROVED'],
        APPROVED: ['PROCESSED', 'PAID'],
      },
    };

    const transitions = ROLE_TRANSITIONS[currentUser.role];
    if (!transitions) {
      throw new ValidationError('Your role does not have permission to change payroll status.');
    }
    const allowed = transitions[record.status] || [];
    if (!allowed.includes(status)) {
      throw new ValidationError(
        `${currentUser.role} cannot change status from ${record.status} to ${status}.`
      );
    }

    const updated = await prisma.payrollRecord.update({
      where: { id: recordId },
      data: updateData,
      include: PAYROLL_RECORD_INCLUDE,
    });

    await this.logPayrollAudit({
      organizationId: record.organizationId,
      payrollRecordId: recordId,
      employeeUserId: (record as any).membership?.userId,
      action: 'STATUS_CHANGED',
      fromStatus: record.status,
      toStatus: status,
      triggeredBy: currentUser.userId,
      bsYear: record.bsYear,
      bsMonth: record.bsMonth,
    });

    return flattenRecordUser(updated);
  }

  async bulkUpdateStatus(bsYear: number, bsMonth: number, status: string, currentUser: JWTPayload) {
    const where: Record<string, unknown> = { bsYear, bsMonth };
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    if (status === 'APPROVED' || status === 'PAID') {
      const blockedCount = await prisma.payrollRecord.count({
        where: { ...where, status: 'NEEDS_RECALCULATION' },
      });
      if (blockedCount > 0) {
        throw new ValidationError(
          `${blockedCount} employee(s) have attendance corrections and must be regenerated before bulk ${status.toLowerCase()}.`,
          'NEEDS_RECALCULATION'
        );
      }
    }

    const BULK_ROLE_TRANSITIONS: Record<string, string[]> = {
      ORG_ACCOUNTANT: ['PROCESSED', 'PAID'],
      ORG_ADMIN: ['PROCESSED', 'APPROVED', 'PAID'],
      SUPER_ADMIN: ['PROCESSED', 'APPROVED', 'PAID'],
    };
    const allowedStatuses = BULK_ROLE_TRANSITIONS[currentUser.role];
    if (!allowedStatuses || !allowedStatuses.includes(status)) {
      throw new ValidationError(
        `${currentUser.role} cannot bulk update payroll to ${status}.`
      );
    }

    // Fetch records with membership for audit + email
    const records = await prisma.payrollRecord.findMany({
      where,
      select: {
        id: true,
        status: true,
        membershipId: true,
        organizationId: true,
        membership: { select: { userId: true } },
      },
    });

    const updateData: Record<string, unknown> = { status };
    if (status === 'PROCESSED') updateData.processedAt = new Date();
    if (status === 'APPROVED') updateData.approvedAt = new Date();
    if (status === 'PAID') updateData.paidAt = new Date();

    await prisma.payrollRecord.updateMany({ where, data: updateData });

    // Audit log (non-blocking)
    Promise.all(records.map(r =>
      this.logPayrollAudit({
        organizationId: r.organizationId,
        payrollRecordId: r.id,
        employeeUserId: r.membership?.userId,
        action: 'STATUS_CHANGED',
        fromStatus: r.status,
        toStatus: status,
        triggeredBy: currentUser.userId,
        bsYear,
        bsMonth,
      })
    )).catch(err => log.error({ err }, 'Failed to write bulk payroll audit logs'));

    if (status === 'APPROVED') {
      try {
        const fullRecords = await prisma.payrollRecord.findMany({
          where,
          include: {
            membership: {
              select: {
                user: { select: { email: true, firstName: true } },
              },
            },
            organization: { select: { name: true } },
          },
        });
        const toNumLocal = (v: any) => typeof v === 'number' ? v : parseFloat(v?.toString() || '0');
        emailService.sendPayrollBulkNotification(
          fullRecords.map(r => ({
            email: r.membership.user.email,
            firstName: r.membership.user.firstName,
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

  // ======== Flag payroll needs recalculation ========

  async flagPayrollNeedsRecalculation(
    membershipId: string,
    organizationId: string,
    bsYear: number,
    bsMonth: number,
    triggeredBy: string,
    attendanceRecordId?: string,
    reason?: string
  ): Promise<{ flagged: boolean; previousStatus?: string }> {
    const existing = await prisma.payrollRecord.findUnique({
      where: { membershipId_bsYear_bsMonth: { membershipId, bsYear, bsMonth } },
      select: { id: true, status: true, membership: { select: { userId: true } } },
    });

    if (!existing) return { flagged: false };
    if (existing.status === 'DRAFT') return { flagged: false };
    if (existing.status === 'NEEDS_RECALCULATION') return { flagged: true, previousStatus: existing.status };

    await prisma.payrollRecord.update({
      where: { id: existing.id },
      data: { status: 'NEEDS_RECALCULATION' },
    });

    await this.logPayrollAudit({
      organizationId,
      payrollRecordId: existing.id,
      employeeUserId: (existing as any).membership?.userId,
      action: 'FLAGGED_NEEDS_RECALCULATION',
      fromStatus: existing.status,
      toStatus: 'NEEDS_RECALCULATION',
      triggeredBy,
      attendanceRecordId,
      reason: reason ?? 'Attendance record corrected after payroll was generated',
      bsYear,
      bsMonth,
    });

    log.warn({ membershipId, bsYear, bsMonth, previousStatus: existing.status }, 'Payroll flagged NEEDS_RECALCULATION');

    return { flagged: true, previousStatus: existing.status };
  }

  // ======== Multi-month ========

  async getMultiMonthData(fromBsYear: number, fromBsMonth: number, toBsYear: number, toBsMonth: number, currentUser: JWTPayload) {
    const months: Array<{ bsYear: number; bsMonth: number }> = [];
    let currentYear = fromBsYear;
    let currentMonth = fromBsMonth;
    while (currentYear < toBsYear || (currentYear === toBsYear && currentMonth <= toBsMonth)) {
      months.push({ bsYear: currentYear, bsMonth: currentMonth });
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    }
    if (months.length > 12) throw new ValidationError('Maximum 12 months allowed');

    const where: Record<string, unknown> = {
      OR: months.map((m) => ({ bsYear: m.bsYear, bsMonth: m.bsMonth })),
    };
    if (currentUser.role === 'EMPLOYEE') {
      where.membershipId = currentUser.membershipId;
    } else if (currentUser.role !== 'SUPER_ADMIN' && currentUser.organizationId) {
      where.organizationId = currentUser.organizationId;
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        membership: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: [{ membership: { user: { firstName: 'asc' } } }, { bsYear: 'asc' }, { bsMonth: 'asc' }],
    });

    const employeeMap: Record<string, any> = {};
    for (const record of records) {
      const membershipId = record.membershipId;
      if (!employeeMap[membershipId]) {
        employeeMap[membershipId] = {
          userId: record.membership.user.id,
          membershipId,
          employee: {
            firstName: record.membership.user.firstName,
            lastName: record.membership.user.lastName,
            employeeId: record.membership.employeeId,
            email: record.membership.user.email,
          },
          months: {},
          totals: {
            basicSalary: 0, grossSalary: 0, totalDeductions: 0,
            netSalary: 0, employeeSsf: 0, employeePf: 0, tds: 0, monthsProcessed: 0,
          },
        };
      }
      const emp = employeeMap[membershipId];
      const monthKey = `${record.bsYear}-${record.bsMonth}`;
      emp.months[monthKey] = {
        id: record.id,
        bsYear: record.bsYear, bsMonth: record.bsMonth,
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
      where.membershipId = currentUser.membershipId;
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

  private async getApprovedLeaves(membershipId: string, adStart: Date, adEnd: Date) {
    const leaves = await prisma.leave.findMany({
      where: {
        membershipId,
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
      if (leave.type === 'UNPAID') { unpaidDays += days; } else { paidDays += days; }
    }
    return { paidDays, unpaidDays };
  }

  private async getDaysPresent(membershipId: string, adStart: Date, adEnd: Date) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        membershipId,
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
      where: { membershipId, checkInTime: { gte: adStart, lte: adEnd }, status: 'CHECKED_IN' },
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