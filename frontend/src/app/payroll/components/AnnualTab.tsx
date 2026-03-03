'use client';

import { Clock, FileText, Download } from 'lucide-react';
import ProBlurOverlay from '@/components/ProBlurOverlay';
import { fmt, API_BASE } from '../utils';
import { t, Language } from '@/lib/i18n';

interface Props {
  language: Language;
  isStarter: boolean;
  annualYear: number;
  annualData: any;
  loadingAnnual: boolean;
  onSetYear: (y: number) => void;
  onLoad: () => void;
  onUpgrade: () => void;
}

const YEARS = [2080, 2081, 2082, 2083];

export default function AnnualTab({
  language, isStarter,
  annualYear, annualData, loadingAnnual,
  onSetYear, onLoad, onUpgrade,
}: Props) {
  const lang = language;

  const handleCsvExport = async () => {
    const res = await fetch(
      `${API_BASE}/api/payroll/annual/export?bsYear=${annualYear}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-tax-${annualYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Filter card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              {t('payroll.annualTax', lang)}
            </h2>
            <p className="text-xs text-slate-500">
              {t('payroll.annualReportDesc', lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Year selector */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('date.year', lang)}</label>
              <select
                value={annualYear}
                onChange={(e) => onSetYear(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* View button */}
            <button
              onClick={onLoad}
              disabled={loadingAnnual}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {loadingAnnual ? t('common.loading', lang) : t('payroll.viewReport', lang)}
            </button>

            {/* CSV export — gated on plan */}
            {annualData && (
              <button
                disabled={isStarter}
                onClick={handleCsvExport}
                title={isStarter ? t('common.opsRequired', lang) : undefined}
                className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-50"
              >
                {isStarter && (
                  <span className="px-1 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-800 rounded">
                    PRO
                  </span>
                )}
                <Download className="w-3 h-3" />
                {t('payroll.csvDownload', lang)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingAnnual && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
        </div>
      )}

      {/* No data */}
      {!loadingAnnual && annualData && annualData.employees?.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {t('common.noData', lang)}
          </h3>
          <p className="text-xs text-slate-500">{t('payroll.noYearData', lang)}</p>
        </div>
      )}

      {/* Data table */}
      {!loadingAnnual && annualData?.employees?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('payroll.annualReport', lang)} — {annualYear}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left  py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {t('payroll.employee', lang)}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {t('payroll.annualBasic', lang)}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {t('payroll.annualGross', lang)}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    SSF
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PF
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    TDS
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {t('payroll.deductions', lang)}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {t('payroll.annualNet', lang)}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {annualData.employees.map((emp: any) => (
                  <tr key={emp.userId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">
                        {emp.employee.firstName} {emp.employee.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(emp.totals.basicSalary)}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(emp.totals.grossSalary)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(emp.totals.employeeSsf)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(emp.totals.employeePf)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(emp.totals.tds)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(emp.totals.totalDeductions)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(emp.totals.netSalary)}</td>
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                  <td className="py-3 px-4 text-sm text-slate-900">{t('payroll.total', lang)}</td>
                  <td className="py-3 px-4 text-right text-sm">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.basicSalary,    0))}</td>
                  <td className="py-3 px-4 text-right text-sm">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.grossSalary,   0))}</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.employeeSsf, 0))}</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.employeePf,  0))}</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.tds,         0))}</td>
                  <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.totalDeductions, 0))}</td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.netSalary,  0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Starter upgrade overlay */}
      {isStarter && !annualData && !loadingAnnual && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          {/* Blurred skeleton */}
          <div className="blur-sm pointer-events-none select-none bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Employee</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Annual Basic</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Annual Gross</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">SSF</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">PF</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">TDS</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Total Ded.</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Annual Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Rajesh Sharma', '3,60,000', '4,68,000', '15,600', '14,400', '12,000', '42,000', '4,26,000'],
                  ['Sita Thapa',    '4,20,000', '5,46,000', '18,200', '16,800', '18,000', '53,000', '4,93,000'],
                  ['Bikash Karki',  '2,88,000', '3,74,400', '12,480', '11,520',  '8,000', '32,000', '3,42,400'],
                ].map(([name, ...vals]) => (
                  <tr key={name}>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{name}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="py-3 px-4 text-right text-sm text-slate-600">Rs. {v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upgrade CTA overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="bg-white rounded-xl border border-amber-200 shadow-lg p-6 text-center max-w-sm mx-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {t('payroll.annualReport', lang)}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {t('payroll.annualReportDesc', lang)}
              </p>
              <button
                onClick={onUpgrade}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {t('common.upgrade', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}