'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import AccountantLayout from '@/components/AccountantLayout'
import { t, Language } from '@/lib/i18n'
import { api } from '@/lib/api'
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  BarChart3,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
]
const BS_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
]
const YEARS = [2080, 2081, 2082, 2083]

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type TabKey = 'monthly' | 'annual'

export default function AccountantReportsPage() {
  const { language } = useAuth()
  const lang = language as Language

  const now = new Date()
  const currentBsYear = now.getMonth() >= 3 ? now.getFullYear() + 57 : now.getFullYear() + 56

  const [activeTab, setActiveTab] = useState<TabKey>('monthly')
  const [error, setError] = useState('')
  const [exportingCsv, setExportingCsv] = useState(false)

  // Monthly
  const [monthYear, setMonthYear] = useState(currentBsYear)
  const [monthMonth, setMonthMonth] = useState(1)
  const [monthData, setMonthData] = useState<any>(null)
  const [loadingMonth, setLoadingMonth] = useState(false)

  // Annual
  const [annualYear, setAnnualYear] = useState(currentBsYear)
  const [annualData, setAnnualData] = useState<any>(null)
  const [loadingAnnual, setLoadingAnnual] = useState(false)

  const loadMonthly = async () => {
    setLoadingMonth(true)
    setError('')
    try {
      const res = await api.get(`/api/v1/payroll/records?bsYear=${monthYear}&bsMonth=${monthMonth}`)
      if (res.error) throw new Error(res.error.message)
      setMonthData(res.data)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoadingMonth(false)
    }
  }

  const loadAnnual = async () => {
    setLoadingAnnual(true)
    setError('')
    try {
      const res = await api.get(`/api/v1/payroll/annual-report?bsYear=${annualYear}`)
      if (res.error) throw new Error(res.error.message)
      setAnnualData(res.data)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoadingAnnual(false)
    }
  }

  const exportCsv = async (type: 'monthly' | 'annual') => {
    setExportingCsv(true)
    try {
      const url =
        type === 'monthly'
          ? `${API_URL}/api/v1/payroll/export/bank-sheet?bsYear=${monthYear}&bsMonth=${monthMonth}`
          : `${API_URL}/api/v1/payroll/annual-report/csv?bsYear=${annualYear}`
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download =
        type === 'monthly'
          ? `payroll-${monthYear}-${monthMonth}.csv`
          : `annual-tax-${annualYear}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExportingCsv(false)
    }
  }

  const exportDetailed = async () => {
    setExportingCsv(true)
    try {
      const url = `${API_URL}/api/v1/payroll/export/detailed?bsYear=${monthYear}&bsMonth=${monthMonth}`
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `payroll-detailed-${monthYear}-${monthMonth}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExportingCsv(false)
    }
  }

  const records: any[] = monthData?.records || monthData || []
  const annualEmployees: any[] = annualData?.employees || []
  const monthLabel = lang === 'NEPALI' ? BS_MONTHS_NP[monthMonth - 1] : BS_MONTHS_EN[monthMonth - 1]

  return (
    <AccountantLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('reports.title', lang)}</h1>
            <p className="text-xs text-slate-500">
              {lang === 'NEPALI'
                ? 'पढ्ने मात्र — सम्पादन अनुमति छैन'
                : 'Read-only — no edit permissions'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {[
            {
              key: 'monthly' as TabKey,
              label: lang === 'NEPALI' ? 'मासिक प्रतिवेदन' : 'Monthly Report',
              icon: Calendar,
            },
            { key: 'annual' as TabKey, label: t('payroll.annualReport', lang), icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* ── Monthly Tab ── */}
        {activeTab === 'monthly' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="mb-1 text-sm font-semibold text-slate-900">
                    {lang === 'NEPALI' ? 'मासिक तलब प्रतिवेदन' : 'Monthly Payroll Report'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'NEPALI'
                      ? 'एक महिनाको सबै कर्मचारीको तलब विवरण'
                      : 'Full payroll breakdown for all employees in a month'}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      {t('date.year', lang)}
                    </label>
                    <select
                      value={monthYear}
                      onChange={(e) => setMonthYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      {t('date.month', lang)}
                    </label>
                    <select
                      value={monthMonth}
                      onChange={(e) => setMonthMonth(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    >
                      {BS_MONTHS_EN.map((m, i) => (
                        <option key={i} value={i + 1}>
                          {lang === 'NEPALI' ? BS_MONTHS_NP[i] : m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={loadMonthly}
                    disabled={loadingMonth}
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    {loadingMonth ? t('common.loading', lang) : t('common.view', lang)}
                  </button>
                  {records.length > 0 && (
                    <>
                      <button
                        onClick={() => exportCsv('monthly')}
                        disabled={exportingCsv}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {lang === 'NEPALI' ? 'बैंक CSV' : 'Bank CSV'}
                      </button>
                      <button
                        onClick={exportDetailed}
                        disabled={exportingCsv}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {lang === 'NEPALI' ? 'विस्तृत CSV' : 'Detailed CSV'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {loadingMonth && <LoadingCard lang={lang} />}

            {!loadingMonth && records.length > 0 && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    {
                      label: lang === 'NEPALI' ? 'कर्मचारी' : 'Employees',
                      value: String(records.length),
                      color: 'blue' as const,
                    },
                    {
                      label: lang === 'NEPALI' ? 'जम्मा कुल' : 'Total Gross',
                      value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.grossSalary, 0))}`,
                      color: 'slate' as const,
                    },
                    {
                      label: lang === 'NEPALI' ? 'जम्मा कटौती' : 'Total Deductions',
                      value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.totalDeductions, 0))}`,
                      color: 'rose' as const,
                    },
                    {
                      label: lang === 'NEPALI' ? 'जम्मा खुद' : 'Total Net',
                      value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.netSalary, 0))}`,
                      color: 'emerald' as const,
                    },
                  ].map((card) => (
                    <SummaryCard key={card.label} {...card} sub={`${monthLabel} ${monthYear}`} />
                  ))}
                </div>

                {/* Monthly table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthLabel} {monthYear} —{' '}
                      {lang === 'NEPALI' ? 'तलब विवरण' : 'Payroll Details'}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          {[
                            [t('payroll.employee', lang), 'left'],
                            [t('payroll.basic', lang), 'right'],
                            [t('payroll.allowances', lang), 'right'],
                            [t('payroll.gross', lang), 'right'],
                            ['SSF', 'right'],
                            ['PF', 'right'],
                            ['TDS', 'right'],
                            [t('payroll.deductions', lang), 'right'],
                            [t('payroll.netSalary', lang), 'right'],
                            [t('common.status', lang), 'center'],
                          ].map(([label, align]) => (
                            <th
                              key={label}
                              className={`text-${align} px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400`}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map((r: any) => {
                          const allowances =
                            (r.dearnessAllowance || 0) +
                            (r.transportAllowance || 0) +
                            (r.medicalAllowance || 0) +
                            (r.otherAllowances || 0)
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-slate-900">
                                  {r.user?.firstName} {r.user?.lastName}
                                </div>
                                <div className="text-xs text-slate-400">{r.user?.employeeId}</div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-slate-600">
                                {fmt(r.basicSalary)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-slate-600">
                                {fmt(allowances)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                                {fmt(r.grossSalary)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-rose-600">
                                {fmt(r.employeeSsf || 0)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-rose-600">
                                {fmt(r.employeePf || 0)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-rose-600">
                                {fmt(r.tds || 0)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-rose-600">
                                {fmt(r.totalDeductions)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                                {fmt(r.netSalary)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                          <td className="px-4 py-3 text-sm">{t('common.total', lang)}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            {fmt(records.reduce((s: number, r: any) => s + r.basicSalary, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">--</td>
                          <td className="px-4 py-3 text-right text-sm">
                            {fmt(records.reduce((s: number, r: any) => s + r.grossSalary, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-rose-700">
                            {fmt(
                              records.reduce((s: number, r: any) => s + (r.employeeSsf || 0), 0),
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-rose-700">
                            {fmt(records.reduce((s: number, r: any) => s + (r.employeePf || 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-rose-700">
                            {fmt(records.reduce((s: number, r: any) => s + (r.tds || 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-rose-700">
                            {fmt(records.reduce((s: number, r: any) => s + r.totalDeductions, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                            {fmt(records.reduce((s: number, r: any) => s + r.netSalary, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!loadingMonth && monthData && records.length === 0 && <EmptyCard lang={lang} />}
          </div>
        )}

        {/* ── Annual Tax Tab ── */}
        {activeTab === 'annual' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="mb-1 text-sm font-semibold text-slate-900">
                    {t('payroll.annualReport', lang)}
                  </h2>
                  <p className="text-xs text-slate-500">{t('payroll.annualReportDesc', lang)}</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      {t('date.year', lang)}
                    </label>
                    <select
                      value={annualYear}
                      onChange={(e) => setAnnualYear(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={loadAnnual}
                    disabled={loadingAnnual}
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    {loadingAnnual ? t('common.loading', lang) : t('payroll.viewReport', lang)}
                  </button>
                  {annualEmployees.length > 0 && (
                    <button
                      onClick={() => exportCsv('annual')}
                      disabled={exportingCsv}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('common.export', lang)} CSV
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingAnnual && <LoadingCard lang={lang} />}

            {!loadingAnnual && annualEmployees.length > 0 && (
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
                        {[
                          [t('payroll.employee', lang), 'left'],
                          [t('payroll.annualBasic', lang), 'right'],
                          [t('payroll.annualGross', lang), 'right'],
                          ['SSF', 'right'],
                          ['PF', 'right'],
                          ['TDS', 'right'],
                          [t('payroll.deductions', lang), 'right'],
                          [t('payroll.annualNet', lang), 'right'],
                        ].map(([label, align]) => (
                          <th
                            key={label}
                            className={`text-${align} px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400`}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {annualEmployees.map((emp: any) => (
                        <tr key={emp.userId} className="hover:bg-slate-50/50">
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
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                        <td className="px-4 py-3 text-sm">{t('common.total', lang)}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.basicSalary,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.grossSalary,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-rose-700">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.employeeSsf,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-rose-700">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.employeePf,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-rose-700">
                          {fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.tds, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-rose-700">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.totalDeductions,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                          {fmt(
                            annualEmployees.reduce(
                              (s: number, e: any) => s + e.totals.netSalary,
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {!loadingAnnual && annualData && annualEmployees.length === 0 && (
              <EmptyCard lang={lang} />
            )}
          </div>
        )}
      </div>
    </AccountantLayout>
  )
}

// ── Sub-components ──

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
      <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-500">{t('common.noData', lang)}</p>
    </div>
  )
}

const CARD_STYLES = {
  blue: {
    wrap: 'bg-blue-50 border-blue-200',
    val: 'text-blue-900',
    sub: 'text-blue-600',
    icon: <DollarSign className="h-4 w-4 text-blue-500" />,
  },
  slate: {
    wrap: 'bg-slate-50 border-slate-200',
    val: 'text-slate-900',
    sub: 'text-slate-500',
    icon: <DollarSign className="h-4 w-4 text-slate-500" />,
  },
  rose: {
    wrap: 'bg-rose-50 border-rose-200',
    val: 'text-rose-900',
    sub: 'text-rose-600',
    icon: <TrendingUp className="h-4 w-4 text-rose-500" />,
  },
  emerald: {
    wrap: 'bg-emerald-50 border-emerald-200',
    val: 'text-emerald-900',
    sub: 'text-emerald-600',
    icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
  },
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: keyof typeof CARD_STYLES
}) {
  const s = CARD_STYLES[color]
  return (
    <div className={`${s.wrap} rounded-xl border p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-xs font-medium ${s.sub}`}>{label}</span>
        {s.icon}
      </div>
      <p className={`text-lg font-bold ${s.val}`}>{value}</p>
      <p className={`text-xs ${s.sub} mt-1`}>{sub}</p>
    </div>
  )
}
