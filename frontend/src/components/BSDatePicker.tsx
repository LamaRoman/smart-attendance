'use client';
import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import NepaliDate from 'nepali-date-converter';

// ─── Constants ────────────────────────────────────────────────────────────────
// nepali-date-converter supports ~2000–2090 BS reliably.
// Expanded from the old 2079–2090 so DOB pickers work for all employees.
const MIN_BS_YEAR = 2000;
const MAX_BS_YEAR = 2090;

const BS_MONTHS_NP = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
const BS_MONTHS_EN = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** Convert a JS Date (AD) to Bikram Sambat { year, month, day } (month is 1-indexed) */
function adToBS(date: Date): { year: number; month: number; day: number } {
  const nd = new NepaliDate(date);
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
}

/** Convert a BS date (month is 1-indexed) to a JS Date (AD) */
function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay); // NepaliDate uses 0-indexed month
  return nd.toJsDate();
}

/**
 * Return the number of days in a given BS month.
 * Strategy: find 1st of next BS month in AD, step back 1 day, read the BS day number.
 */
function getDaysInBSMonth(year: number, month1: number): number {
  const nextMonth = month1 === 12 ? 1 : month1 + 1;
  const nextYear  = month1 === 12 ? year + 1 : year;
  const firstOfNextMonthAD = bsToAD(nextYear, nextMonth, 1);
  // Step back 1 calendar day (use noon to avoid any DST edge cases)
  const lastDayAD = new Date(
    firstOfNextMonthAD.getFullYear(),
    firstOfNextMonthAD.getMonth(),
    firstOfNextMonthAD.getDate() - 1,
    12, 0, 0
  );
  return adToBS(lastDayAD).day;
}

/** Format a JS Date as a local YYYY-MM-DD string (avoids UTC off-by-one in Nepal UTC+5:45) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
function toNepaliDigits(num: number): string {
  return String(num).split('').map(ch => NEPALI_DIGITS[parseInt(ch)] || ch).join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BSDatePickerProps {
  value: string;
  onChange: (adDateStr: string) => void;
  label?: string;
  min?: string;        // AD date string e.g. "2000-01-01"
  max?: string;        // AD date string e.g. "2025-12-31"
  placeholder?: string;
}

export default function BSDatePicker({ value, onChange, label, min, max, placeholder }: BSDatePickerProps) {
  const today = adToBS(new Date());

  const [bsYear,  setBsYear]  = useState(today.year);
  const [bsMonth, setBsMonth] = useState(today.month);
  const [bsDay,   setBsDay]   = useState(today.day);
  const [isOpen,  setIsOpen]  = useState(false);

  // Click-outside to close
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

  // Sync picker state when value prop changes
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      const bs = adToBS(new Date(y, m - 1, d));
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
    }
  }, [value]);

  const daysInMonth   = getDaysInBSMonth(bsYear, bsMonth);
  const availableYears = Array.from(
    { length: MAX_BS_YEAR - MIN_BS_YEAR + 1 },
    (_, i) => MIN_BS_YEAR + i
  );

  // Minimum BS date derived from the `min` AD prop
  const minBS = min ? (() => {
    const [y, m, d] = min.split('-').map(Number);
    return adToBS(new Date(y, m - 1, d));
  })() : null;

  const isBeforeMin = (year: number, month: number, day: number): boolean => {
    if (!minBS) return false;
    if (year  !== minBS.year)  return year  < minBS.year;
    if (month !== minBS.month) return month < minBS.month;
    return day < minBS.day;
  };

  // Maximum BS date derived from the `max` AD prop
  const maxBS = max ? (() => {
    const [y, m, d] = max.split('-').map(Number);
    return adToBS(new Date(y, m - 1, d));
  })() : null;

  const isAfterMax = (year: number, month: number, day: number): boolean => {
    if (!maxBS) return false;
    if (year  !== maxBS.year)  return year  > maxBS.year;
    if (month !== maxBS.month) return month > maxBS.month;
    return day > maxBS.day;
  };

  const isDisabled = (year: number, month: number, day: number): boolean =>
    isBeforeMin(year, month, day) || isAfterMax(year, month, day);

  const handleConfirm = () => {
    const clampedDay = Math.min(bsDay, daysInMonth);
    const adDate = bsToAD(bsYear, bsMonth, clampedDay);
    onChange(toLocalDateString(adDate));
    setIsOpen(false);
  };

  const clampDay = (day: number, year: number, month: number): number =>
    Math.min(day, getDaysInBSMonth(year, month));

  const handleMonthChange = (newMonth: number) => {
    setBsMonth(newMonth);
    setBsDay(prev => clampDay(prev, bsYear, newMonth));
  };

  const handleYearChange = (newYear: number) => {
    setBsYear(newYear);
    setBsDay(prev => clampDay(prev, newYear, bsMonth));
  };

  // Boundary guards for prev/next buttons
  const canGoPrev = !(bsMonth === 1  && bsYear <= MIN_BS_YEAR);
  const canGoNext = !(bsMonth === 12 && bsYear >= MAX_BS_YEAR);

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

  // Display the AD date in the trigger button
  const adDate = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : null;
  const displayAD = adDate
    ? adDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="w-full relative" ref={containerRef}>
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
          ? <ChevronUp   className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">

          {/* Month / Year navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
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
                const isToday    = bsYear === today.year && bsMonth === today.month && day === today.day;
                const disabled   = isDisabled(bsYear, bsMonth, day);
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
                disabled={isDisabled(bsYear, bsMonth, bsDay)}
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