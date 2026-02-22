import { PaySettings } from './types';

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र',
];

export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashar', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

export const defaultSettings: PaySettings = {
  basicSalary: 0,
  dearnessAllowance: 0,
  transportAllowance: 0,
  medicalAllowance: 0,
  otherAllowances: 0,
  overtimeRatePerHour: 0,
  ssfEnabled: true,
  employeeSsfRate: 11,
  employerSsfRate: 20,
  tdsEnabled: true,
  pfEnabled: false,
  employeePfRate: 10,
  employerPfRate: 10,
  citEnabled: false,
  citAmount: 0,
  isMarried: false,
  advanceDeduction: 0,
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
};

/**
 * TDS estimation — Nepal FY 2081/82, 6-bracket progressive slab.
 *
 * Taxable income = Annual gross − (Annual employee SSF + PF + CIT)
 *
 * Slabs (annual):
 *   Single:  Rs. 5,00,000 @ 1%  |  Married: Rs. 6,00,000 @ 1%
 *   Next Rs. 2,00,000 @ 10%
 *   Next Rs. 3,00,000 @ 20%
 *   Next Rs. 10,00,000 @ 30%
 *   Next Rs. 30,00,000 @ 36%
 *   Remainder          @ 39%
 *
 * Returns the monthly TDS instalment (annual tax / 12).
 * This is a client-side estimate only; the backend is authoritative for
 * actual payroll records.
 */
export function calculateTDS(
  annualGross: number,
  isMarried: boolean,
  monthlySsf: number,
  monthlyPf: number,
  monthlyCit: number,
): number {
  const taxableIncome =
    annualGross - monthlySsf * 12 - monthlyPf * 12 - monthlyCit * 12;
  if (taxableIncome <= 0) return 0;

  const firstSlabLimit = isMarried ? 600_000 : 500_000;

  const slabs = [
    { limit: firstSlabLimit, rate: 0.01 },
    { limit: 200_000,        rate: 0.10 },
    { limit: 300_000,        rate: 0.20 },
    { limit: 1_000_000,      rate: 0.30 },
    { limit: 3_000_000,      rate: 0.36 },
    { limit: Infinity,       rate: 0.39 },
  ];

  let tax = 0;
  let remaining = taxableIncome;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, slab.limit);
    tax += taxable * slab.rate;
    remaining -= taxable;
  }

  return tax / 12; // Monthly instalment
}

/** Format a number as currency with two decimal places. */
export function fmt(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Build a PaySettings object from a raw API record (fills missing fields with defaults). */
export function paySettingsFromApi(existing: any): PaySettings {
  return {
    basicSalary:        existing.basicSalary        || 0,
    dearnessAllowance:  existing.dearnessAllowance  || 0,
    transportAllowance: existing.transportAllowance || 0,
    medicalAllowance:   existing.medicalAllowance   || 0,
    otherAllowances:    existing.otherAllowances    || 0,
    overtimeRatePerHour: existing.overtimeRatePerHour || 0,
    ssfEnabled:        existing.ssfEnabled         ?? true,
    employeeSsfRate:   existing.employeeSsfRate    ?? 11,
    employerSsfRate:   existing.employerSsfRate    ?? 20,
    tdsEnabled:        existing.tdsEnabled         ?? true,
    pfEnabled:         existing.pfEnabled          ?? false,
    employeePfRate:    existing.employeePfRate     ?? 10,
    employerPfRate:    existing.employerPfRate     ?? 10,
    citEnabled:        existing.citEnabled         ?? false,
    citAmount:         existing.citAmount          || 0,
    isMarried:         existing.isMarried          ?? false,
    advanceDeduction:  existing.advanceDeduction   || 0,
    bankName:          existing.bankName           || '',
    bankAccountName:   existing.bankAccountName    || '',
    bankAccountNumber: existing.bankAccountNumber  || '',
  };
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
