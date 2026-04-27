'use client'

import { useState } from 'react'
import { Clock, FileText, Eye, Download, History, X, AlertCircle } from 'lucide-react'
import { PayrollRecord, STATUS_COLORS } from '../types'
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils'
import { t, Language } from '@/lib/i18n'
import { api } from '@/lib/api'

interface AuditEntry {
  id: string
  action: string
  fromStatus?: string | null
  toStatus?: string | null
  triggeredBy: string
  triggeredByName?: string
  reason?: string | null
  createdAt: string
}

interface Props {
  language: Language
  isStarter: boolean
  userRole?: string
  featurePayrollWorkflow: boolean
  recYear: number
  recMonth: number
  records: PayrollRecord[]
  loadingRecords: boolean
  onSetYear: (y: number) => void
  onSetMonth: (m: number) => void
  onLoad: () => void
  onBulkStatus: (status: string) => void
  onViewPayslip: (r: PayrollRecord) => void
}

const YEARS = [2081, 2082, 2083]

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  GENERATED: { label: 'Generated', color: 'bg-blue-50 text-blue-700' },
  REGENERATED: { label: 'Regenerated', color: 'bg-amber-50 text-amber-700' },
  STATUS_CHANGED: { label: 'Status changed', color: 'bg-slate-100 text-slate-700' },
  FLAGGED_NEEDS_RECALCULATION: { label: 'Flagged for recalc', color: 'bg-rose-50 text-rose-700' },
  VOIDED: { label: 'Voided', color: 'bg-rose-100 text-rose-800' },
}

export default function RecordsTab({
  language,
  isStarter,
  userRole,
  featurePayrollWorkflow,
  recYear,
  recMonth,
  records,
  loadingRecords,
  onSetYear,
  onSetMonth,
  onLoad,
  onBulkStatus,
  onViewPayslip,
}: Props) {
  const lang = language
  const isNp = language === 'NEPALI'
  const isAccountant = userRole === 'ORG_ACCOUNTANT'

  // Audit modal state
  const [auditRecord, setAuditRecord] = useState<PayrollRecord | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

  // Derive month-level state from actual record statuses
  const hasPaid = records.some((r) => r.status === 'PAID')
  const allPaid = records.length > 0 && records.every((r) => r.status === 'PAID')
  const allApproved = records.length > 0 && records.every((r) => r.status === 'APPROVED')
  const allProcessed = records.length > 0 && records.every((r) => r.status === 'PROCESSED')
  const hasDraft = records.some((r) => r.status === 'DRAFT' || r.status === 'NEEDS_RECALCULATION')

  // Button visibility — mirrors backend ROLE_TRANSITIONS exactly
  const showProcess = featurePayrollWorkflow && hasDraft && !hasPaid
  const showApprove = featurePayrollWorkflow && !isAccountant && allProcessed
  const showPaid = featurePayrollWorkflow && allApproved

  const openAudit = async (record: PayrollRecord) => {
    setAuditRecord(record)
    setAuditLogs([])
    setAuditError('')
    setAuditLoading(true)
    const res = await api.get(`/api/v1/payroll/records/${record.id}/audit`)
    setAuditLoading(false)
    if (res.error) {
      setAuditError(res.error.message)
    } else {
      setAuditLogs((res.data as AuditEntry[]) || [])
    }
  }

  const handleBankCsv = async () => {
    const res = await fetch(
      `${API_BASE}/api/v1/payroll/export/bank-sheet?bsYear=${recYear}&bsMonth=${recMonth}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    )
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bank-salary-sheet-${recYear}-${recMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const handleDetailedCsv = async () => {
    const res = await fetch(
      `${API_BASE}/api/v1/payroll/export/detailed?bsYear=${recYear}&bsMonth=${recMonth}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    )
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-detailed-${recYear}-${recMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-sm font-semibold text-slate-900">{t('payroll.records', lang)}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={recYear}
              onChange={(e) => {
                onSetYear(Number(e.target.value))
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={recMonth}
              onChange={(e) => {
                onSetMonth(Number(e.target.value))
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {BS_MONTHS_NP.map((m, i) => (
                <option key={i} value={i + 1}>
                  {lang === 'NEPALI' ? m : BS_MONTHS_EN[i]}
                </option>
              ))}
            </select>

            {records.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {allPaid && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    ✓ {isNp ? 'भुक्तानी भयो' : 'Month fully paid'}
                  </span>
                )}

                {showProcess && (
                  <WorkflowButton
                    label={t('payroll.process', lang)}
                    onClick={() => onBulkStatus('PROCESSED')}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                  />
                )}

                {showApprove && (
                  <WorkflowButton
                    label={t('leave.approved', lang)}
                    onClick={() => onBulkStatus('APPROVED')}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  />
                )}

                {showPaid && (
                  <WorkflowButton
                    label={t('payroll.paid', lang)}
                    onClick={() => onBulkStatus('PAID')}
                    className="bg-slate-100 text-slate-900 hover:bg-slate-200"
                  />
                )}

                {isAccountant && allProcessed && (
                  <span className="px-2 text-xs font-medium text-amber-600">
                    {isNp ? '⏳ प्रशासकको स्वीकृति पर्खिँदैछ' : '⏳ Awaiting admin approval'}
                  </span>
                )}

                <button
                  disabled={isStarter}
                  onClick={handleBankCsv}
                  title={isStarter ? t('common.opsRequired', lang) : undefined}
                  className="flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-50"
                >
                  {isStarter && (
                    <span className="rounded bg-amber-200 px-1 py-0.5 text-[8px] font-semibold text-amber-800">
                      PRO
                    </span>
                  )}
                  <Download className="h-3 w-3" />
                  {isNp ? 'बैंक CSV' : 'Bank CSV'}
                </button>
                <button
                  disabled={isStarter}
                  onClick={handleDetailedCsv}
                  title={isStarter ? t('common.opsRequired', lang) : undefined}
                  className="flex items-center gap-1 rounded-md bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-violet-50"
                >
                  {isStarter && (
                    <span className="rounded bg-violet-200 px-1 py-0.5 text-[8px] font-semibold text-violet-800">
                      PRO
                    </span>
                  )}
                  <Download className="h-3 w-3" />
                  {isNp ? 'विस्तृत CSV' : 'Detailed CSV'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loadingRecords ? (
        <LoadingCard lang={lang} />
      ) : records.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {[
                    { label: t('payroll.employee', lang), align: 'left' },
                    { label: t('common.days', lang), align: 'center' },
                    { label: t('payroll.gross', lang), align: 'right' },
                    { label: 'SSF', align: 'right' },
                    { label: 'PF', align: 'right' },
                    { label: 'TDS', align: 'right' },
                    { label: t('payroll.net', lang), align: 'right' },
                    { label: t('common.status', lang), align: 'center' },
                    { label: '', align: 'center' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 text-${h.align}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {r.user?.firstName} {r.user?.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{r.user?.employeeId}</div>

                      {/* Inline override summary */}
                      {r.regeneratedFromPaid && (
                        <div className="mt-1.5 space-y-0.5 rounded-md border border-rose-100 bg-rose-50 p-1.5">
                          <div className="text-[10px] font-semibold text-rose-600">
                            ⚠ {isNp ? 'भुक्तानी पछि परिवर्तन' : 'Overridden after payment'}
                          </div>
                          {r.regeneratedBy && (
                            <div className="text-[10px] text-slate-500">
                              {isNp ? 'द्वारा:' : 'By:'}{' '}
                              <span className="font-medium">{r.regeneratedBy}</span>
                            </div>
                          )}
                          {r.regeneratedAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(r.regeneratedAt).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          {r.previousNetSalary != null && (
                            <div className="text-[10px] text-slate-500">
                              {isNp ? 'अघिल्लो नेट:' : 'Prev net:'}{' '}
                              <span className="font-medium text-rose-500 line-through">
                                Rs.{r.previousNetSalary.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {r.overrideReason && (
                            <div
                              className="max-w-[200px] truncate text-[10px] italic text-slate-500"
                              title={r.overrideReason}
                            >
                              "{r.overrideReason}"
                            </div>
                          )}
                          <button
                            onClick={() => openAudit(r)}
                            className="mt-0.5 text-[10px] font-medium text-violet-600 hover:underline"
                          >
                            {isNp ? 'पूरा इतिहास हेर्नुहोस् →' : 'View full history →'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-emerald-600">{r.daysPresent}</span>
                      <span className="text-slate-300">/{r.workingDaysInMonth}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {fmt(r.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(r.employeeSsf)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {fmt(r.employeePf)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">{fmt(r.tds)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                      {fmt(r.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${STATUS_COLORS[r.status] || ''}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewPayslip(r)}
                          title={isNp ? 'पेस्लिप हेर्नुहोस्' : 'View payslip'}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openAudit(r)}
                          title={isNp ? 'अडिट ट्रेल' : 'Audit trail'}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            {t('common.noRecord', lang)}
          </h3>
          <p className="text-xs text-slate-500">
            {isNp ? 'पहिले तलब गणना गर्नुहोस्' : 'Generate payroll first'}
          </p>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'अडिट ट्रेल' : 'Audit trail'}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {auditRecord.user?.firstName} {auditRecord.user?.lastName}
                  {' · '}
                  {isNp ? auditRecord.monthNameNp : auditRecord.monthNameEn} {auditRecord.bsYear}
                </p>
              </div>
              <button
                onClick={() => {
                  setAuditRecord(null)
                  setAuditLogs([])
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6">
              {auditLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                </div>
              ) : auditError ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <p className="text-xs text-rose-700">{auditError}</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <History className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">{isNp ? 'कुनै अडिट लग छैन' : 'No audit logs found'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log, i) => {
                    const actionMeta = ACTION_LABELS[log.action] || {
                      label: log.action,
                      color: 'bg-slate-100 text-slate-700',
                    }
                    return (
                      <div key={log.id} className="relative pl-6">
                        {/* Timeline line */}
                        {i < auditLogs.length - 1 && (
                          <div className="absolute bottom-0 left-[7px] top-5 w-px bg-slate-200" />
                        )}
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-300 shadow-sm" />

                        <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${actionMeta.color}`}
                            >
                              {actionMeta.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Status transition */}
                          {log.fromStatus && log.toStatus && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span
                                className={`rounded px-1.5 py-0.5 ${STATUS_COLORS[log.fromStatus] || 'bg-slate-100 text-slate-600'}`}
                              >
                                {log.fromStatus}
                              </span>
                              <span>→</span>
                              <span
                                className={`rounded px-1.5 py-0.5 ${STATUS_COLORS[log.toStatus] || 'bg-slate-100 text-slate-600'}`}
                              >
                                {log.toStatus}
                              </span>
                            </div>
                          )}

                          {/* Triggered by */}
                          <div className="text-[10px] text-slate-500">
                            {isNp ? 'द्वारा:' : 'By:'}{' '}
                            <span className="font-medium text-slate-700">
                              {log.triggeredByName || log.triggeredBy}
                            </span>
                          </div>

                          {/* Reason */}
                          {log.reason && (
                            <div className="mt-1.5 border-t border-slate-200 pt-1.5 text-[10px] italic text-slate-500">
                              "{log.reason}"
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkflowButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${className}`}
    >
      {label}
    </button>
  )
}

function LoadingCard({ lang }: { lang: Language }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <Clock className="h-6 w-6 animate-spin text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
    </div>
  )
}
