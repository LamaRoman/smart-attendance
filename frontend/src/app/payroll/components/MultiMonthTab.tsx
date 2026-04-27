'use client'

import { BarChart3, Clock, FileText, Download } from 'lucide-react'
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils'
import { STATUS_COLORS } from '../types'
import { t, Language } from '@/lib/i18n'
import React from 'react'
interface Props {
  language: Language
  isStarter: boolean
  multiFromYear: number
  multiFromMonth: number
  multiToYear: number
  multiToMonth: number
  multiMonthData: any
  loadingMultiMonth: boolean
  expandedEmployee: string | null
  onSetFromYear: (y: number) => void
  onSetFromMonth: (m: number) => void
  onSetToYear: (y: number) => void
  onSetToMonth: (m: number) => void
  onLoad: () => void
  onToggleExpand: (id: string) => void
  onUpgrade: () => void
}

const YEARS = [2081, 2082, 2083]

export default function MultiMonthTab({
  language,
  isStarter,
  multiFromYear,
  multiFromMonth,
  multiToYear,
  multiToMonth,
  multiMonthData,
  loadingMultiMonth,
  expandedEmployee,
  onSetFromYear,
  onSetFromMonth,
  onSetToYear,
  onSetToMonth,
  onLoad,
  onToggleExpand,
  onUpgrade,
}: Props) {
  const lang = language

  const handleCsvExport = async () => {
    const res = await fetch(
      `${API_BASE}/api/v1/payroll/multi-month/export?fromBsYear=${multiFromYear}&fromBsMonth=${multiFromMonth}&toBsYear=${multiToYear}&toBsMonth=${multiToMonth}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    )
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `multi-month-${multiFromYear}-${multiFromMonth}-to-${multiToYear}-${multiToMonth}.csv`
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
              {t('payroll.multiMonth', lang)}
            </h2>
            <p className="text-xs text-slate-500">{t('payroll.multiMonthDesc', lang)}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <MonthRangeSelector
              label={t('common.from', lang)}
              year={multiFromYear}
              month={multiFromMonth}
              lang={lang}
              onYearChange={onSetFromYear}
              onMonthChange={onSetFromMonth}
            />
            <MonthRangeSelector
              label={t('common.to', lang)}
              year={multiToYear}
              month={multiToMonth}
              lang={lang}
              onYearChange={onSetToYear}
              onMonthChange={onSetToMonth}
            />

            {/* Load button */}
            <button
              onClick={onLoad}
              disabled={loadingMultiMonth}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <BarChart3 className="h-4 w-4" />
              {loadingMultiMonth ? t('common.loading', lang) : t('common.view', lang)}
            </button>

            {/* CSV export — gated on plan */}
            {multiMonthData && (
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
                CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* States */}
      {loadingMultiMonth ? (
        <LoadingCard lang={lang} />
      ) : multiMonthData?.employees?.length > 0 ? (
        <DataTable
          data={multiMonthData}
          lang={lang}
          expandedEmployee={expandedEmployee}
          onToggleExpand={onToggleExpand}
        />
      ) : multiMonthData ? (
        <EmptyCard lang={lang} />
      ) : null}

      {/* Starter upgrade skeleton */}
      {isStarter && !multiMonthData && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <div className="pointer-events-none select-none overflow-x-auto bg-white blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                    Employee
                  </th>
                  {['Baisakh 2082', 'Jestha 2082', 'Ashar 2082', 'Shrawan 2082'].map((m) => (
                    <th
                      key={m}
                      className="min-w-[130px] px-4 py-3 text-center text-xs font-medium uppercase text-slate-400"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                    Total (4)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Rajesh Sharma', ['31,500', '31,500', '33,000', '33,000'], '1,29,000'],
                  ['Sita Thapa', ['36,750', '36,750', '38,500', '38,500'], '1,50,500'],
                  ['Bikash Karki', ['24,000', '--', '24,000', '24,000'], '72,000'],
                  ['Anita Rai', ['43,500', '43,500', '45,500', '45,500'], '1,78,000'],
                ].map(([name, months, total]) => (
                  <tr key={name as string}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{name}</div>
                      <div className="text-xs text-slate-400">EMP-00X</div>
                    </td>
                    {(months as string[]).map((v, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 text-center text-sm font-medium text-slate-700"
                      >
                        {v === '--' ? <span className="text-slate-300">--</span> : `Rs. ${v}`}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                      Rs. {total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td className="px-4 py-3 text-sm">TOTAL</td>
                  {['1,35,750', '1,11,750', '1,41,000', '1,41,000'].map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center text-sm">
                      Rs. {v}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                    Rs. 5,29,500
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Upgrade CTA overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="mx-4 max-w-sm rounded-xl border border-amber-200 bg-white p-6 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {t('payroll.multiMonth', lang)}
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                {t('payroll.multiMonthUpgradeDesc', lang)}
              </p>
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

// ── Month range selector ──
function MonthRangeSelector({
  label,
  year,
  month,
  lang,
  onYearChange,
  onMonthChange,
}: {
  label: string
  year: number
  month: number
  lang: Language
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <div className="flex gap-2">
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          {BS_MONTHS_EN.map((m, i) => (
            <option key={i} value={i + 1}>
              {lang === 'NEPALI' ? BS_MONTHS_NP[i] : m}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Main data table ──
function DataTable({
  data,
  lang,
  expandedEmployee,
  onToggleExpand,
}: {
  data: any
  lang: Language
  expandedEmployee: string | null
  onToggleExpand: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="sticky left-0 z-10 bg-slate-50/50 px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                {t('payroll.employee', lang)}
              </th>
              {data.months.map((m: any) => (
                <th
                  key={`${m.bsYear}-${m.bsMonth}`}
                  className="min-w-[140px] px-4 py-3 text-center text-xs font-medium uppercase text-slate-400"
                >
                  {lang === 'NEPALI' ? BS_MONTHS_NP[m.bsMonth - 1] : BS_MONTHS_EN[m.bsMonth - 1]}{' '}
                  {m.bsYear}
                </th>
              ))}
              <th className="sticky right-0 z-10 min-w-[120px] bg-slate-50/50 px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                {t('payroll.total', lang)} ({data.months.length})
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.employees.map((emp: any) => (
              <React.Fragment key={emp.membershipId}>
                <tr
                  className="cursor-pointer hover:bg-slate-50/50"
                  onClick={() => onToggleExpand(emp.membershipId)}
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      {emp.employee.firstName} {emp.employee.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                  </td>
                  {data.months.map((m: any) => {
                    const md = emp.months[`${m.bsYear}-${m.bsMonth}`]
                    return (
                      <td key={`${m.bsYear}-${m.bsMonth}`} className="px-4 py-3 text-center">
                        {md ? (
                          <>
                            <div className="text-sm font-medium text-slate-900">
                              Rs. {fmt(md.netSalary)}
                            </div>
                            <div className="mt-0.5 text-[10px]">
                              <span
                                className={`inline-flex rounded-md px-1.5 py-0.5 font-medium ${STATUS_COLORS[md.status] || ''}`}
                              >
                                {md.status === 'PAID'
                                  ? '✅'
                                  : md.status === 'APPROVED'
                                    ? '⏳'
                                    : '📋'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-300">--</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right">
                    <div className="text-sm font-bold text-emerald-700">
                      Rs. {fmt(emp.totals.netSalary)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {emp.totals.monthsProcessed} {t('common.months', lang)}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedEmployee === emp.membershipId && (
                  <tr key={`${emp.membershipId}-detail`}>
                    <td colSpan={data.months.length + 2} className="bg-slate-50 px-4 py-4">
                      <div className="mb-3 text-xs font-semibold text-slate-900">
                        {t('payroll.details', lang)} — {emp.employee.firstName}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-100">
                            {(
                              [
                                ['basicSalary', t('payroll.basic', lang), 'text-slate-600', ''],
                                ['grossSalary', t('payroll.gross', lang), 'text-slate-600', ''],
                                [
                                  'totalDeductions',
                                  t('payroll.deductions', lang),
                                  'text-rose-600',
                                  'text-rose-600',
                                ],
                                [
                                  'netSalary',
                                  t('payroll.net', lang),
                                  'text-emerald-700 font-semibold',
                                  'text-emerald-700 font-bold',
                                ],
                              ] as [string, string, string, string][]
                            ).map(([key, label, cellClass, totalClass]) => (
                              <tr
                                key={key}
                                className={key === 'netSalary' ? 'bg-emerald-50/50' : ''}
                              >
                                <td
                                  className={`px-3 py-2 ${key === 'netSalary' ? 'font-semibold' : 'text-slate-600'}`}
                                >
                                  {label}
                                </td>
                                {data.months.map((m: any) => {
                                  const md = emp.months[`${m.bsYear}-${m.bsMonth}`]
                                  return (
                                    <td
                                      key={`${m.bsYear}-${m.bsMonth}`}
                                      className={`px-3 py-2 text-right ${cellClass}`}
                                    >
                                      {md ? fmt(md[key]) : '--'}
                                    </td>
                                  )
                                })}
                                <td
                                  className={`px-3 py-2 text-right font-medium ${totalClass || cellClass}`}
                                >
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
              </React.Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
              <td className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-sm">
                {t('payroll.total', lang)}
              </td>
              {data.months.map((m: any) => {
                const monthTotal = data.employees.reduce((s: number, emp: any) => {
                  const md = emp.months[`${m.bsYear}-${m.bsMonth}`]
                  return s + (md ? md.netSalary : 0)
                }, 0)
                return (
                  <td key={`${m.bsYear}-${m.bsMonth}`} className="px-4 py-3 text-center text-sm">
                    Rs. {fmt(monthTotal)}
                  </td>
                )
              })}
              <td className="sticky right-0 z-10 bg-slate-100 px-4 py-3 text-right text-sm font-bold text-emerald-700">
                Rs. {fmt(data.grandTotals.netSalary)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LoadingCard({ lang }: { lang: Language }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <Clock className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />
      <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
    </div>
  )
}

function EmptyCard({ lang }: { lang: Language }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <FileText className="mx-auto mb-4 h-8 w-8 text-slate-400" />
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{t('common.noData', lang)}</h3>
      <p className="text-xs text-slate-500">{t('common.noRecord', lang)}</p>
    </div>
  )
}
