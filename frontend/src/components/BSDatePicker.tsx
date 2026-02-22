'use client';
import { useState, useEffect } from 'react';
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

const BS_MONTHS_NP = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
const BS_MONTHS_EN = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

const BS_REF = { year: 2079, month: 1, day: 1 };
const AD_REF = new Date(2022, 3, 14);

function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  let totalDays = 0;
  for (let y = BS_REF.year; y < bsYear; y++) {
    if (!BS_CALENDAR_DATA[y]) continue;
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
  let totalDays = Math.floor((date.getTime() - AD_REF.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return { year: BS_REF.year, month: 1, day: 1 };
  let bsYear = BS_REF.year;
  let bsMonth = 1;
  let bsDay = 1;
  while (totalDays > 0) {
    const daysInMonth = (BS_CALENDAR_DATA[bsYear] || [])[bsMonth - 1] || 30;
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
    if (!BS_CALENDAR_DATA[bsYear]) break;
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
  min?: string;
  placeholder?: string;
}

export default function BSDatePicker({ value, onChange, label, min, placeholder }: BSDatePickerProps) {
  const today = adToBS(new Date());

  const [bsYear, setBsYear] = useState(today.year);
  const [bsMonth, setBsMonth] = useState(today.month);
  const [bsDay, setBsDay] = useState(today.day);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const bs = adToBS(new Date(value));
      setBsYear(bs.year);
      setBsMonth(bs.month);
      setBsDay(bs.day);
    }
  }, [value]);

  const daysInMonth = (BS_CALENDAR_DATA[bsYear] || [])[bsMonth - 1] || 30;
  const availableYears = Object.keys(BS_CALENDAR_DATA).map(Number);

  const handleConfirm = () => {
    const clampedDay = Math.min(bsDay, daysInMonth);
    const adDate = bsToAD(bsYear, bsMonth, clampedDay);
    onChange(adDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const handleMonthChange = (newMonth: number) => {
    setBsMonth(newMonth);
    const newDaysInMonth = (BS_CALENDAR_DATA[bsYear] || [])[newMonth - 1] || 30;
    if (bsDay > newDaysInMonth) setBsDay(newDaysInMonth);
  };

  const handleYearChange = (newYear: number) => {
    setBsYear(newYear);
    const newDaysInMonth = (BS_CALENDAR_DATA[newYear] || [])[bsMonth - 1] || 30;
    if (bsDay > newDaysInMonth) setBsDay(newDaysInMonth);
  };

  const prevMonth = () => {
    if (bsMonth === 1) {
      const newYear = bsYear - 1;
      const newDays = (BS_CALENDAR_DATA[newYear] || [])[11] || 30;
      setBsYear(newYear);
      setBsMonth(12);
      if (bsDay > newDays) setBsDay(newDays);
    } else {
      handleMonthChange(bsMonth - 1);
    }
  };

  const nextMonth = () => {
    if (bsMonth === 12) {
      const newYear = bsYear + 1;
      const newDays = (BS_CALENDAR_DATA[newYear] || [])[0] || 30;
      setBsYear(newYear);
      setBsMonth(1);
      if (bsDay > newDays) setBsDay(newDays);
    } else {
      handleMonthChange(bsMonth + 1);
    }
  };

  const adDate = value ? new Date(value) : null;
  const displayAD = adDate
    ? adDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="w-full">
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
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500"
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
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day grid — 8 columns fits BS months (29-32 days) cleanly */}
          <div className="p-3">
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = bsDay === day;
                const isToday = bsYear === today.year && bsMonth === today.month && day === today.day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setBsDay(day)}
                    className={`
                      h-8 w-full flex items-center justify-center rounded text-xs font-medium transition-colors
                      ${isSelected
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
                {bsToAD(bsYear, bsMonth, bsDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
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

export { adToBS, bsToAD, toNepaliDigits, BS_MONTHS_NP, BS_MONTHS_EN };