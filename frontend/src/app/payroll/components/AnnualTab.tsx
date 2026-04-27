'use client'

import { Clock, FileText, Download } from 'lucide-react'
import ProBlurOverlay from '@/components/ProBlurOverlay'
import { fmt, API_BASE } from '../utils'
import { t, Language } from '@/lib/i18n'

interface Props {
  language: Language
  isStarter: boolean
  annualYear: number
  annualData: any
  loadingAnnual: boolean
  onSetYear: (y: number) => void
  onLoad: () => void
  onUpgrade: () => void
}

const YEARS = [2080, 2081, 2082, 2083]

export default function AnnualTab({
  language,
  isStarter,
  annualYear,
  annualData,
  loadingAnnual,
  onSetYear,
  onLoad,
  onUpgrade,
}: Props) {
  const lang = language

  const handleCsvExport = async () => {
    const res = await fetch(`${API_BASE}/api/v1/payroll/annual-report/csv?bsYear=${annualYear}`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annual-tax-${annualYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Filter card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-slate-900">
              {t('payroll.annualTax', lang)}
            </h2>
            <p className="text-xs text-slate-500">{t('payroll.annualReportDesc', lang)}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Year selector */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('date.year', lang)}</label>
              <select
                value={annualYear}
                onChange={(e) => onSetYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* View button */}
            <button
              onClick={onLoad}
              disabled={loadingAnnual}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {loadingAnnual ? t('common.loading', lang) : t('payroll.viewReport', lang)}
            </button>

            {/* CSV export — gated on plan */}
            {annualData && (
              <button
                disabled={isStarter}
                onClick={handleCsvExport}
                title={isStarter ? t('common.opsRequired', lang) : undefined}
                className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-50"
              >
                {isStarter && (
                  <span className="rounded bg-amber-200 px-1 py-0.5 text-[8px] font-semibold text-amber-800">
                    PRO
                  </span>
                )}
                <Download className="h-3 w-3" />
                {t('payroll.csvDownload', lang)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingAnnual && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Clock className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
        </div>
      )}

      {/* No data */}
      {!loadingAnnual && annualData && annualData.employees?.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <h3 className="mb-1 text-sm font-semibold text-slate-900">{t('common.noData', lang)}</h3>
          <p className="text-xs text-slate-500">{t('payroll.noYearData', lang)}</p>
        </div>
      )}

      {/* Data table */}
      {!loadingAnnual && annualData?.employees?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('payroll.annualReport', lang)} — {annualYear}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.employee', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualBasic', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualGross', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    SSF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    PF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.deductions', lang)}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t('payroll.annualNet', lang)}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {annualData.employees.map((emp: any) => (
                  <tr key={emp.membershipId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {emp.employee.firstName} {emp.employee.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {fmt(emp.totals.basicSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {fmt(emp.totals.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(emp.totals.employeeSsf)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(emp.totals.employeePf)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(emp.totals.tds)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(emp.totals.totalDeductions)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                      {fmt(emp.totals.netSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                  <td className="px-4 py-3 text-sm text-slate-900">{t('payroll.total', lang)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.basicSalary,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.grossSalary,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.employeeSsf,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.employeePf,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {fmt(annualData.employees.reduce((s: number, e: any) => s + e.totals.tds, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-rose-700">
                    {fmt(
                      annualData.employees.reduce(
                        (s: number, e: any) => s + e.totals.totalDeductions,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                    {fmt(
                      annualData.employees.reduce((s: number, e: any) => s + e.totals.netSalary, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Starter upgrade overlay */}
      {isStarter && !annualData && !loadingAnnual && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          {/* Blurred skeleton */}
          <div className="pointer-events-none select-none overflow-x-auto bg-white blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    Annual Basic
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    Annual Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    SSF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    PF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    TDS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    Total Ded.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    Annual Net
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  [
                    'Rajesh Sharma',
                    '3,60,000',
                    '4,68,000',
                    '15,600',
                    '14,400',
                    '12,000',
                    '42,000',
                    '4,26,000',
                  ],
                  [
                    'Sita Thapa',
                    '4,20,000',
                    '5,46,000',
                    '18,200',
                    '16,800',
                    '18,000',
                    '53,000',
                    '4,93,000',
                  ],
                  [
                    'Bikash Karki',
                    '2,88,000',
                    '3,74,400',
                    '12,480',
                    '11,520',
                    '8,000',
                    '32,000',
                    '3,42,400',
                  ],
                ].map(([name, ...vals]) => (
                  <tr key={name}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{name}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-4 py-3 text-right text-sm text-slate-600">
                        Rs. {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upgrade CTA overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="mx-4 max-w-sm rounded-xl border border-amber-200 bg-white p-6 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {t('payroll.annualReport', lang)}
              </h3>
              <p className="mb-4 text-xs text-slate-500">{t('payroll.annualReportDesc', lang)}</p>
              <button
                onClick={onUpgrade}
                className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                {t('common.upgrade', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
