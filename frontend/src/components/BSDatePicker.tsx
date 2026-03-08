'use client';
import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

const BS_CALENDAR_DATA: Record<number, number[]> = {
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

const MIN_SUPPORTED_YEAR = Math.min(...Object.keys(BS_CALENDAR_DATA).map(Number));
const MAX_SUPPORTED_YEAR = Math.max(...Object.keys(BS_CALENDAR_DATA).map(Number));

const BS_MONTHS_NP = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
const BS_MONTHS_EN = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

const BS_REF = { year: 2079, month: 1, day: 1 };
const AD_REF = new Date(2022, 3, 14);

// Bug fix #6: Validate year is in supported range before conversion
function isYearSupported(year: number): boolean {
  return !!BS_CALENDAR_DATA[year];
}

function toLocalDateString(date: Date): string {
  // Bug fix #1 & #3: Use local date parts instead of toISOString() which outputs UTC
  // and causes off-by-one errors in Nepal (UTC+5:45) and other non-UTC timezones
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  // Bug fix #6: Guard against unsupported years
  if (!isYearSupported(bsYear)) {
    throw new Error(`BS year ${bsYear} is not supported. Supported range: ${MIN_SUPPORTED_YEAR}–${MAX_SUPPORTED_YEAR}`);
  }

  let totalDays = 0;
  for (let y = BS_REF.year; y < bsYear; y++) {
    // Bug fix #8: Guard against missing intermediate years to prevent infinite loops
    if (!BS_CALENDAR_DATA[y]) {
      throw new Error(`BS year ${y} is missing from calendar data.`);
    }
    for (let m = 0; m < 12; m++) totalDays += BS_CALENDAR_DATA[y][m];
  }
  for (let m = 0; m < bsMonth - 1; m++) {
    totalDays += (BS_CALENDAR_DATA[bsYear] || [])[m] || 30;
  }
  totalDays += bsDay - 1;
  const result = new Date(AD_REF);
  result.setDate(result.getDate() + totalDays);
  return result;
}

function adToBS(date: Date): { year: number; month: number; day: number } {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const utcRef = Date.UTC(AD_REF.getFullYear(), AD_REF.getMonth(), AD_REF.getDate(), 12);
  let totalDays = Math.round((utcDate - utcRef) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return { year: BS_REF.year, month: 1, day: 1 };
  let bsYear = BS_REF.year;
  let bsMonth = 1;
  let bsDay = 1;
  while (totalDays > 0) {
    // Bug fix #8: Guard against missing intermediate years
    if (!BS_CALENDAR_DATA[bsYear]) {
      throw new Error(`BS year ${bsYear} is missing from calendar data.`);
    }
    const daysInMonth = BS_CALENDAR_DATA[bsYear][bsMonth - 1];
    const remaining = daysInMonth - bsDay;
    if (totalDays <= remaining) {
      bsDay += totalDays;
      totalDays = 0;
    } else {
      totalDays -= remaining + 1;
      bsMonth++;
      bsDay = 1;
      if (bsMonth > 12) {
        bsMonth = 1;
        bsYear++;
      }
    }
  }
  return { year: bsYear, month: bsMonth, day: bsDay };
}

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
function toNepaliDigits(num: number): string {
  return String(num).split('').map(ch => NEPALI_DIGITS[parseInt(ch)] || ch).join('');
}

interface BSDatePickerProps {
  value: string;
  onChange: (adDateStr: string) => void;
  label?: string;
  min?: string;       // AD date string e.g. "2025-01-01"
  placeholder?: string;
}

export default function BSDatePicker({ value, onChange, label, min, placeholder }: BSDatePickerProps) {
  const today = adToBS(new Date());

  const [bsYear, setBsYear] = useState(today.year);
  const [bsMonth, setBsMonth] = useState(today.month);
  const [bsDay, setBsDay] = useState(today.day);
  const [isOpen, setIsOpen] = useState(false);

  // Bug fix #4: Click-outside to close
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      // Parse as local date by splitting manually to avoid UTC midnight issues
      const [y, m, d] = value.split('-').map(Number);
      const bs = adToBS(new Date(y, m - 1, d));
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
    }
  }, [value]);

  const daysInMonth = (BS_CALENDAR_DATA[bsYear] || [])[bsMonth - 1] || 30;
  const availableYears = Object.keys(BS_CALENDAR_DATA).map(Number);

  // Bug fix #1: Compute the minimum BS date from the min prop
  const minBS = min ? (() => {
    const [y, m, d] = min.split('-').map(Number);
    return adToBS(new Date(y, m - 1, d));
  })() : null;

  // Bug fix #1: Check whether a given BS date is before the min
  const isBeforeMin = (year: number, month: number, day: number): boolean => {
    if (!minBS) return false;
    if (year !== minBS.year) return year < minBS.year;
    if (month !== minBS.month) return month < minBS.month;
    return day < minBS.day;
  };

  const handleConfirm = () => {
    const clampedDay = Math.min(bsDay, daysInMonth);
    const adDate = bsToAD(bsYear, bsMonth, clampedDay);
    // Bug fix #1 & #3: Use local date string, not toISOString()
    onChange(toLocalDateString(adDate));
    setIsOpen(false);
  };

  // Bug fix #7: Accept explicit year+month together to avoid stale closure issues
  const clampDay = (day: number, year: number, month: number): number => {
    const days = (BS_CALENDAR_DATA[year] || [])[month - 1] || 30;
    return Math.min(day, days);
  };

  const handleMonthChange = (newMonth: number) => {
    setBsMonth(newMonth);
    // Bug fix #5: Clamp non-destructively — keep intended day, only cap if needed
    setBsDay(prev => clampDay(prev, bsYear, newMonth));
  };

  const handleYearChange = (newYear: number) => {
    setBsYear(newYear);
    // Bug fix #7: Use newYear and current bsMonth (fresh values) to avoid stale state
    setBsDay(prev => clampDay(prev, newYear, bsMonth));
  };

  // Bug fix #2: Guard against navigating outside supported year range
  const canGoPrev = !(bsMonth === 1 && bsYear <= MIN_SUPPORTED_YEAR);
  const canGoNext = !(bsMonth === 12 && bsYear >= MAX_SUPPORTED_YEAR);

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (bsMonth === 1) {
      const newYear = bsYear - 1;
      setBsYear(newYear);
      setBsMonth(12);
      setBsDay(prev => clampDay(prev, newYear, 12));
    } else {
      handleMonthChange(bsMonth - 1);
    }
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    if (bsMonth === 12) {
      const newYear = bsYear + 1;
      setBsYear(newYear);
      setBsMonth(1);
      setBsDay(prev => clampDay(prev, newYear, 1));
    } else {
      handleMonthChange(bsMonth + 1);
    }
  };

  // Bug fix #3: Parse value as local date to avoid UTC off-by-one in display
  const adDate = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : null;
  const displayAD = adDate
    ? adDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {value ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-slate-900">
                {BS_MONTHS_EN[bsMonth - 1]} {bsDay}, {bsYear}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">{displayAD}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400">{placeholder || 'Select date'}</span>
          )}
        </div>
        {isOpen
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">

          {/* Month / Year navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            {/* Bug fix #2: Disable prev/next at boundaries */}
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <select
                  value={bsMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="text-sm font-medium text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer appearance-none pr-5"
                >
                  {BS_MONTHS_NP.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <select
                  value={bsYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="text-sm font-medium text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer appearance-none pr-5"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day grid */}
          <div className="p-3">
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = bsDay === day;
                const isToday = bsYear === today.year && bsMonth === today.month && day === today.day;
                // Bug fix #1: Disable days before min
                const disabled = isBeforeMin(bsYear, bsMonth, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && setBsDay(day)}
                    disabled={disabled}
                    className={`
                      h-8 w-full flex items-center justify-center rounded text-xs font-medium transition-colors
                      ${disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : isSelected
                          ? 'bg-slate-900 text-white'
                          : isToday
                            ? 'border border-slate-300 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    {toNepaliDigits(day)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date summary + actions */}
          <div className="px-3 pb-3 space-y-2">
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                {BS_MONTHS_NP[bsMonth - 1]} {toNepaliDigits(bsDay)}, {toNepaliDigits(bsYear)}
              </span>
              <span className="text-xs text-slate-400">
                {toLocalDateString(bsToAD(bsYear, bsMonth, bsDay))}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isBeforeMin(bsYear, bsMonth, bsDay)}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { adToBS, bsToAD, toNepaliDigits, toLocalDateString, BS_MONTHS_NP, BS_MONTHS_EN };