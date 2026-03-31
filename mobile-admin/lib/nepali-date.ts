// Nepali (BS) ↔ AD date conversion utilities
// Ported from web frontend — do not modify without syncing both

// ─── BS month names ───────────────────────────────────────────────────────────
export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra',
];

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण',
  'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर',
  'पौष', 'माघ', 'फाल्गुन', 'चैत्र',
];

// ─── BS Calendar Data (2070–2090) ────────────────────────────────────────────
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2070: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2073: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2074: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2077: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2078: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2081: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2089: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
};

// Reference: BS 2070/01/01 = AD 2013/04/14
const BS_REF = { year: 2070, month: 1, day: 1 };
const AD_REF = new Date(2013, 3, 14);

// ─── Core: AD → BS ───────────────────────────────────────────────────────────
export function adToBS(date: Date): { year: number; month: number; day: number } {
  const diffTime = date.getTime() - AD_REF.getTime();
  let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (totalDays < 0) throw new Error('Date before supported BS range (2070+)');

  let bsYear = BS_REF.year;
  let bsMonth = BS_REF.month;
  let bsDay = BS_REF.day;

  while (totalDays > 0) {
    const daysInMonth = daysInBSMonth(bsYear, bsMonth);
    const remaining = daysInMonth - bsDay;

    if (totalDays <= remaining) {
      bsDay += totalDays;
      totalDays = 0;
    } else {
      totalDays -= remaining + 1;
      bsMonth++;
      bsDay = 1;
      if (bsMonth > 12) { bsMonth = 1; bsYear++; }
    }

    if (!BS_CALENDAR_DATA[bsYear]) throw new Error(`BS year ${bsYear} out of range`);
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

// ─── Core: BS → AD ───────────────────────────────────────────────────────────
export function bsToAD(yearOrDate: number | { year: number; month: number; day: number }, month?: number, day?: number): Date {
  let bsYear: number, bsMonth: number, bsDay: number;

  if (typeof yearOrDate === 'object') {
    bsYear = yearOrDate.year;
    bsMonth = yearOrDate.month;
    bsDay = yearOrDate.day;
  } else {
    bsYear = yearOrDate;
    bsMonth = month!;
    bsDay = day!;
  }

  if (!BS_CALENDAR_DATA[bsYear]) throw new Error(`BS year ${bsYear} out of range`);

  let totalDays = 0;

  for (let y = BS_REF.year; y < bsYear; y++) {
    if (!BS_CALENDAR_DATA[y]) break;
    for (let m = 1; m <= 12; m++) totalDays += BS_CALENDAR_DATA[y][m - 1];
  }

  for (let m = 1; m < bsMonth; m++) totalDays += BS_CALENDAR_DATA[bsYear][m - 1];
  totalDays += bsDay - 1;

  const result = new Date(AD_REF);
  result.setDate(result.getDate() + totalDays);
  return result;
}

// ─── Days in a BS month ───────────────────────────────────────────────────────
export function daysInBSMonth(year: number, month: number): number {
  const data = BS_CALENDAR_DATA[year];
  if (!data) throw new Error(`BS year ${year} out of range`);
  return data[month - 1];
}

// ─── Today in BS ─────────────────────────────────────────────────────────────
export function todayBS(): { year: number; month: number; day: number } {
  return adToBS(new Date());
}

// ─── Nepali digits ────────────────────────────────────────────────────────────
const NP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, d => NP_DIGITS[parseInt(d)]);
}

// ─── Format BS date ───────────────────────────────────────────────────────────
export function formatBSDate(
  year: number, month: number, day: number, lang: 'en' | 'np' = 'en'
): string {
  if (lang === 'np') {
    return `${toNepaliDigits(year)} ${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(day)}`;
  }
  return `${year} ${BS_MONTHS_EN[month - 1]} ${day}`;
}