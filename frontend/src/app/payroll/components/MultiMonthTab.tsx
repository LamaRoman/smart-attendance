'use client';

import { BarChart3, Clock, FileText, Download } from 'lucide-react';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils';
import { STATUS_COLORS } from '../types';

interface Props {
  isNp: boolean;
  isStarter: boolean;
  multiFromYear: number;
  multiFromMonth: number;
  multiToYear: number;
  multiToMonth: number;
  multiMonthData: any;
  loadingMultiMonth: boolean;
  expandedEmployee: string | null;
  onSetFromYear: (y: number) => void;
  onSetFromMonth: (m: number) => void;
  onSetToYear: (y: number) => void;
  onSetToMonth: (m: number) => void;
  onLoad: () => void;
  onToggleExpand: (id: string) => void;
  onUpgrade: () => void;
}

const YEARS = [2081, 2082, 2083];

export default function MultiMonthTab({
  isNp, isStarter,
  multiFromYear, multiFromMonth, multiToYear, multiToMonth,
  multiMonthData, loadingMultiMonth, expandedEmployee,
  onSetFromYear, onSetFromMonth, onSetToYear, onSetToMonth,
  onLoad, onToggleExpand, onUpgrade,
}: Props) {
  const handleCsvExport = async () => {
    const res = await fetch(
      `${API_BASE}/api/payroll/multi-month/export?fromBsYear=${multiFromYear}&fromBsMonth=${multiFromMonth}&toBsYear=${multiToYear}&toBsMonth=${multiToMonth}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-month-${multiFromYear}-${multiFromMonth}-to-${multiToYear}-${multiToMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter card â€” always visible */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              {isNp ? 'à¤¬à¤¹à¥-महिना à¤¤à¤²à¤¬ à¤¦à¥ƒà¤¶à¥à¤¯' : 'Multi-Month Salary View'}
            </h2>
            <p className="text-xs text-slate-500">
              {isNp
                ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€à¤¹à¤°à¥‚à¤•à¥‹ à¤§à¥‡à¤°à¥ˆ महिनाà¤•à¥‹ à¤¤à¤²à¤¬ à¤à¤•à¥ˆ à¤ªà¤Ÿà¤• à¤¹à¥‡à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥'
                : 'View salary across multiple months'}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <MonthRangeSelector
              label={isNp ? 'à¤¦à¥‡à¤–à¤¿' : 'From'}
              year={multiFromYear}
              month={multiFromMonth}
              isNp={isNp}
              onYearChange={onSetFromYear}
              onMonthChange={onSetFromMonth}
            />
            <MonthRangeSelector
              label={isNp ? 'सम्म' : 'To'}
              year={multiToYear}
              month={multiToMonth}
              isNp={isNp}
              onYearChange={onSetToYear}
              onMonthChange={onSetToMonth}
            />
            <button
              onClick={onLoad}
              disabled={loadingMultiMonth}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4" />
              {loadingMultiMonth
                ? isNp ? 'à¤²à¥‹à¤¡ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Loading...'
                : isNp ? 'à¤¹à¥‡à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'View'}
            </button>

            {/* FIX (MEDIUM): always shown; disabled with PRO badge on Starter */}
            {multiMonthData && (
              <button
                disabled={isStarter}
                onClick={handleCsvExport}
                title={isStarter ? (isNp ? 'Operations à¤ªà¥à¤²à¤¾à¤¨ à¤†à¤µà¤¶à¥à¤¯à¤• à¤›' : 'Requires Operations plan') : undefined}
                className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-50"
              >
                {isStarter && (
                  <span className="px-1 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-800 rounded">
                    PRO
                  </span>
                )}
                <Download className="w-3 h-3" />
                CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {loadingMultiMonth ? (
        <LoadingCard isNp={isNp} />
      ) : multiMonthData?.employees?.length > 0 ? (
        <DataTable
          data={multiMonthData}
          isNp={isNp}
          expandedEmployee={expandedEmployee}
          onToggleExpand={onToggleExpand}
        />
      ) : multiMonthData ? (
        <EmptyCard isNp={isNp} />
      ) : null}

      {/* Skeleton preview for Starter */}
      {isStarter && !multiMonthData && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          {/* Blurred skeleton */}
          <div className="blur-sm pointer-events-none select-none bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Employee</th>
                  {['Baisakh 2082','Jestha 2082','Ashar 2082','Shrawan 2082'].map((m) => (
                    <th key={m} className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase min-w-[130px]">{m}</th>
                  ))}
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Total (4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Rajesh Sharma', ['31,500','31,500','33,000','33,000'], '1,29,000'],
                  ['Sita Thapa',    ['36,750','36,750','38,500','38,500'], '1,50,500'],
                  ['Bikash Karki',  ['24,000','â€”','24,000','24,000'],      '72,000'],
                  ['Anita Rai',     ['43,500','43,500','45,500','45,500'], '1,78,000'],
                ].map(([name, months, total]) => (
                  <tr key={name as string}>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{name}</div>
                      <div className="text-xs text-slate-400">EMP-00X</div>
                    </td>
                    {(months as string[]).map((v, i) => (
                      <td key={i} className="py-3 px-4 text-center text-sm font-medium text-slate-700">
                        {v === 'â€”' ? <span className="text-slate-300">â€”</span> : `Rs. ${v}`}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-600">Rs. {total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td className="py-3 px-4 text-sm">TOTAL</td>
                  {['1,35,750','1,11,750','1,41,000','1,41,000'].map((v, i) => (
                    <td key={i} className="py-3 px-4 text-center text-sm">Rs. {v}</td>
                  ))}
                  <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">Rs. 5,29,500</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Upgrade CTA overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="bg-white rounded-xl border border-amber-200 shadow-lg p-6 text-center max-w-sm mx-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">ðŸ“…</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {isNp ? 'à¤¬à¤¹à¥-महिना à¤¤à¤²à¤¬ à¤¦à¥ƒà¤¶à¥à¤¯' : 'Multi-Month Salary View'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {isNp
                  ? 'à¤à¤•à¥ˆ à¤ªà¤Ÿà¤• à¤§à¥‡à¤°à¥ˆ महिनाà¤•à¥‹ à¤¤à¤²à¤¬ à¤¤à¥à¤²à¤¨à¤¾ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥ à¤° CSV à¤¨à¤¿à¤°à¥à¤¯à¤¾à¤¤ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥à¥¤'
                  : 'Compare salaries across months side-by-side and export to CSV for payroll audits.'}
              </p>
              <button
                onClick={onUpgrade}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isNp ? 'à¤…à¤ªà¤—à¥à¤°à¥‡à¤¡ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Upgrade to Operations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€ Month range selector â”€â”€ */
function MonthRangeSelector({
  label, year, month, isNp, onYearChange, onMonthChange,
}: {
  label: string; year: number; month: number; isNp: boolean;
  onYearChange: (y: number) => void; onMonthChange: (m: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
        >
          {BS_MONTHS_NP.map((m, i) => (
            <option key={i} value={i + 1}>{isNp ? m : BS_MONTHS_EN[i]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* â”€â”€ Main data table â”€â”€ */
function DataTable({
  data, isNp, expandedEmployee, onToggleExpand,
}: {
  data: any; isNp: boolean; expandedEmployee: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase sticky left-0 bg-slate-50/50 z-10">
                {isNp ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€' : 'Employee'}
              </th>
              {data.months.map((m: any) => (
                <th
                  key={`${m.bsYear}-${m.bsMonth}`}
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase min-w-[140px]"
                >
                  {isNp ? BS_MONTHS_NP[m.bsMonth - 1] : BS_MONTHS_EN[m.bsMonth - 1]} {m.bsYear}
                </th>
              ))}
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase min-w-[120px] sticky right-0 bg-slate-50/50 z-10">
                {isNp ? 'à¤œà¤®à¥à¤®à¤¾' : 'Total'} ({data.months.length})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.employees.map((emp: any) => (
              <>
                {/* Summary row */}
                <tr
                  key={emp.userId}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => onToggleExpand(emp.userId)}
                >
                  <td className="py-3 px-4 sticky left-0 bg-white z-10">
                    <div className="text-sm font-medium text-slate-900">
                      {emp.employee.firstName} {emp.employee.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                  </td>
                  {data.months.map((m: any) => {
                    const monthData = emp.months[`${m.bsYear}-${m.bsMonth}`];
                    return (
                      <td key={`${m.bsYear}-${m.bsMonth}`} className="py-3 px-4 text-center">
                        {monthData ? (
                          <>
                            <div className="text-sm font-medium text-slate-900">
                              Rs. {fmt(monthData.netSalary)}
                            </div>
                            <div className="text-[10px] mt-0.5">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded-md font-medium ${STATUS_COLORS[monthData.status] || ''}`}
                              >
                                {monthData.status === 'PAID' ? 'âœ…' : monthData.status === 'APPROVED' ? 'â³' : 'ðŸ“'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-300 text-xs">â€”</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right sticky right-0 bg-white z-10">
                    <div className="text-sm font-bold text-emerald-700">
                      Rs. {fmt(emp.totals.netSalary)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {emp.totals.monthsProcessed} {isNp ? 'महिना' : 'months'}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedEmployee === emp.userId && (
                  <tr>
                    <td colSpan={data.months.length + 2} className="px-4 py-4 bg-slate-50">
                      <div className="text-xs font-semibold text-slate-900 mb-3">
                        {isNp ? 'à¤µà¤¿à¤¸à¥à¤¤à¥ƒà¤¤' : 'Details'} â€” {emp.employee.firstName}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-100">
                            {(
                              [
                                ['basicSalary',    isNp ? 'à¤†à¤§à¤¾à¤°à¤­à¥‚à¤¤' : 'Basic',      'text-slate-600', ''],
                                ['grossSalary',    isNp ? 'à¤•à¥à¤²'      : 'Gross',      'text-slate-600', ''],
                                ['totalDeductions',isNp ? 'à¤•à¤Ÿà¥Œà¤¤à¥€'    : 'Deductions', 'text-rose-600',  'text-rose-600'],
                                ['netSalary',      isNp ? 'à¤–à¥à¤¦'      : 'Net',        'text-emerald-700 font-semibold', 'text-emerald-700 font-bold'],
                              ] as [string, string, string, string][]
                            ).map(([key, label, cellClass, totalClass]) => (
                              <tr key={key} className={key === 'netSalary' ? 'bg-emerald-50/50' : ''}>
                                <td className={`py-2 px-3 ${key === 'netSalary' ? 'font-semibold' : 'text-slate-600'}`}>
                                  {label}
                                </td>
                                {data.months.map((m: any) => {
                                  const monthData = emp.months[`${m.bsYear}-${m.bsMonth}`];
                                  return (
                                    <td
                                      key={`${m.bsYear}-${m.bsMonth}`}
                                      className={`py-2 px-3 text-right ${cellClass}`}
                                    >
                                      {monthData ? fmt(monthData[key]) : 'â€”'}
                                    </td>
                                  );
                                })}
                                <td className={`py-2 px-3 text-right font-medium ${totalClass || cellClass}`}>
                                  {fmt(emp.totals[key])}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
              <td className="py-3 px-4 text-sm sticky left-0 bg-slate-100 z-10">
                {isNp ? 'à¤œà¤®à¥à¤®à¤¾' : 'TOTAL'}
              </td>
              {data.months.map((m: any) => {
                const monthTotal = data.employees.reduce((s: number, emp: any) => {
                  const md = emp.months[`${m.bsYear}-${m.bsMonth}`];
                  return s + (md ? md.netSalary : 0);
                }, 0);
                return (
                  <td key={`${m.bsYear}-${m.bsMonth}`} className="py-3 px-4 text-center text-sm">
                    Rs. {fmt(monthTotal)}
                  </td>
                );
              })}
              <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700 sticky right-0 bg-slate-100 z-10">
                Rs. {fmt(data.grandTotals.netSalary)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LoadingCard({ isNp }: { isNp: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Clock className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
      <p className="text-sm text-slate-500">{isNp ? 'à¤²à¥‹à¤¡ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Loading...'}</p>
    </div>
  );
}

function EmptyCard({ isNp }: { isNp: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-4" />
      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {isNp ? 'à¤¡à¤¾à¤Ÿà¤¾ à¤›à¥ˆà¤¨' : 'No data'}
      </h3>
      <p className="text-xs text-slate-500">
        {isNp ? 'à¤°à¥‡à¤•à¤°à¥à¤¡ à¤›à¥ˆà¤¨' : 'No records for this period'}
      </p>
    </div>
  );
}
