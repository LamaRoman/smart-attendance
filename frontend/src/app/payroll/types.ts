export interface PaySettings {
  basicSalary: number;
  dearnessAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  overtimeRatePerHour: number;
  ssfEnabled: boolean;
  employeeSsfRate: number;
  employerSsfRate: number;
  tdsEnabled: boolean;
  pfEnabled: boolean;
  employeePfRate: number;
  employerPfRate: number;
  citEnabled: boolean;
  citAmount: number;
  isMarried: boolean;
  advanceDeduction: number;
  dashainBonusPercent: number | null;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
}
export interface PayrollRecord {
  id: string;
  userId: string;
  bsYear: number;
  bsMonth: number;
  workingDaysInMonth: number;
  holidaysInMonth: number;
  daysPresent: number;
  daysAbsent: number;
  overtimeHours: number;
  basicSalary: number;
  dearnessAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  grossSalary: number;
  absenceDeduction: number;
  employeeSsf: number;
  employerSsf: number;
  employeePf: number;
  employerPf: number;
  citDeduction: number;
  advanceDeduction: number;
  dashainBonus: number;
  isMarried: boolean;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  regeneratedFromPaid?: boolean;
  regeneratedAt?: string | null;
  regeneratedBy?: string | null;
  previousNetSalary?: number | null;
  overrideReason?: string | null;
  monthNameEn: string;
  monthNameNp: string;
  user?: { firstName: string; lastName: string; employeeId: string };
}
export type Tab = 'settings' | 'generate' | 'records' | 'annual' | 'multimonth';
export interface LiveCalculation {
  gross: number;
  employeeSsf: number;
  employeePf: number;
  citDeduction: number;
  tds: number;
  totalDeductions: number;
  net: number;
  employerSsf: number;
  employerPf: number;
}
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PROCESSED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-slate-100 text-slate-900',
};
