'use client'

import { X, Eye, Download } from 'lucide-react'
import { PayrollRecord } from '../types'
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils'
import { t, Language } from '@/lib/i18n'

interface Props {
  record: PayrollRecord
  language: Language
  isStarter: boolean
  onClose: () => void
  onError: (msg: string) => void
}

export default function PayslipModal({ record, language, isStarter, onClose, onError }: Props) {
  const isNp = language === 'NEPALI'
  const monthLabel = isNp ? BS_MONTHS_NP[record.bsMonth - 1] : BS_MONTHS_EN[record.bsMonth - 1]

  const pdfUrl = `${API_BASE}/api/v1/payroll/payslip/${record.id}/pdf`

  const handleDownload = async () => {
    const res = await fetch(pdfUrl, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!res.ok) {
      onError('Download failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payslip-${record.user?.employeeId || ''}-${record.bsYear}-${record.bsMonth}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Earnings breakdown
  const earningsRows: [string, number][] = [
    [isNp ? 'आधारभूत तलब' : 'Basic salary', record.basicSalary],
    [isNp ? 'महँगी भत्ता' : 'Dearness allowance', record.dearnessAllowance],
    [isNp ? 'यातायात भत्ता' : 'Transport allowance', record.transportAllowance],
    [isNp ? 'चिकित्सा भत्ता' : 'Medical allowance', record.medicalAllowance],
    [isNp ? 'अन्य भत्ता' : 'Other allowances', record.otherAllowances],
    [isNp ? 'ओभरटाइम' : 'Overtime pay', record.overtimePay],
    ...(record.dashainBonus > 0
      ? [[isNp ? 'दशैं बोनस' : 'Dashain bonus', record.dashainBonus] as [string, number]]
      : []),
  ]

  // Absence deduction shown in earnings as a negative (already baked into grossSalary)
  // This makes the earnings section self-consistent:
  // Basic + Allowances + Overtime + Dashain - AbsenceDeduction = Gross
  const absenceRow: [string, number] | null =
    record.absenceDeduction > 0
      ? [isNp ? 'अनुपस्थिति कटौती' : 'Absence deduction', record.absenceDeduction]
      : null

  // Deductions — absenceDeduction NOT included because it is already in grossSalary
  const deductionRows: [string, number][] = [
    [`SSF (${isNp ? 'कर्मचारी' : 'Employee'})`, record.employeeSsf],
    [`PF (${isNp ? 'कर्मचारी' : 'Employee'})`, record.employeePf],
    ['CIT', record.citDeduction],
    ['TDS', record.tds],
    [isNp ? 'पेशगी कटौती' : 'Advance deduction', record.advanceDeduction],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isNp ? 'पे-स्लिप' : 'Payslip'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {record.user?.firstName} {record.user?.lastName} — {monthLabel} {record.bsYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              {isNp ? 'पूर्वावलोकन' : 'Preview'}
            </button>
            <button
              disabled={isStarter}
              onClick={handleDownload}
              title={
                isStarter
                  ? isNp
                    ? 'Operations प्लान आवश्यक छ'
                    : 'Requires Operations plan'
                  : undefined
              }
              className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStarter && (
                <span className="rounded bg-amber-200 px-1 py-0.5 text-[8px] font-semibold text-amber-800">
                  PRO
                </span>
              )}
              <Download className="h-3.5 w-3.5" />
              {isNp ? 'डाउनलोड' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* Attendance */}
          <Section label={isNp ? 'उपस्थिति' : 'Attendance'}>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
              <StatBox label={isNp ? 'कार्य दिन' : 'Working'} value={record.workingDaysInMonth} />
              <StatBox
                label={isNp ? 'उपस्थित' : 'Present'}
                value={record.daysPresent}
                className="bg-emerald-50"
                valueClass="text-emerald-700"
              />
              <StatBox
                label={isNp ? 'अनुपस्थित' : 'Absent'}
                value={record.daysAbsent}
                className="bg-rose-50"
                valueClass="text-rose-700"
              />
              {(record as any).paidLeaveDays > 0 && (
                <StatBox
                  label={isNp ? 'सशुल्क बिदा' : 'Paid leave'}
                  value={(record as any).paidLeaveDays}
                  className="bg-blue-50"
                  valueClass="text-blue-700"
                />
              )}
              {(record as any).unpaidLeaveDays > 0 && (
                <StatBox
                  label={isNp ? 'बिना तलब बिदा' : 'Unpaid leave'}
                  value={(record as any).unpaidLeaveDays}
                  className="bg-amber-50"
                  valueClass="text-amber-700"
                />
              )}
            </div>
          </Section>

          {/* Earnings */}
          <Section label={isNp ? 'आमदानी' : 'Earnings'}>
            <div className="space-y-1 text-xs">
              {earningsRows
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem key={label} label={label} value={`Rs. ${fmt(val)}`} />
                ))}
              {/* Absence deduction shown as negative in earnings — explains why gross < basic */}
              {absenceRow && (
                <LineItem
                  label={absenceRow[0]}
                  value={`- Rs. ${fmt(absenceRow[1])}`}
                  valueClass="text-rose-600"
                />
              )}
              <LineItem
                label={isNp ? 'कुल आमदानी' : 'Gross salary'}
                value={`Rs. ${fmt(record.grossSalary + (record.dashainBonus || 0))}`}
                bold
                separator
              />
            </div>
          </Section>

          {/* Deductions */}
          <Section label={isNp ? 'कटौती' : 'Deductions'}>
            <div className="space-y-1 text-xs">
              {deductionRows
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem
                    key={label}
                    label={label}
                    value={`Rs. ${fmt(val)}`}
                    valueClass="text-rose-600"
                  />
                ))}
              <LineItem
                label={isNp ? 'जम्मा कटौती' : 'Total deductions'}
                value={`Rs. ${fmt(record.totalDeductions)}`}
                bold
                separator
                valueClass="text-rose-700"
              />
            </div>
          </Section>

          {/* Employer contribution */}
          {(record.employerSsf > 0 || record.employerPf > 0) && (
            <Section label={isNp ? 'नियोक्ता योगदान' : 'Employer contribution'}>
              <div className="space-y-1 text-xs">
                {record.employerSsf > 0 && (
                  <LineItem
                    label={`SSF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerSsf)}`}
                    valueClass="text-blue-600"
                  />
                )}
                {record.employerPf > 0 && (
                  <LineItem
                    label={`PF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerPf)}`}
                    valueClass="text-blue-600"
                  />
                )}
              </div>
            </Section>
          )}

          {/* Net salary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                {isNp ? 'खुद तलब' : 'Net salary'}
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Rs. {fmt(record.netSalary)}
              </span>
            </div>
            {record.isMarried && (
              <p className="mt-1 text-[10px] text-slate-500">
                {isNp ? '* विवाहित कर स्ल्याब लागू' : '* Married tax slab applied'}
              </p>
            )}
          </div>

          {/* Full calculation breakdown */}
          <Section label={isNp ? 'पूर्ण विवरण' : 'Full breakdown'}>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs">
              {/* Earnings block */}
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {isNp ? 'आमदानी' : 'Earnings'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {earningsRows
                  .filter(([, v]) => v > 0)
                  .map(([label, val]) => (
                    <BreakdownRow key={label} label={label} value={`Rs. ${fmt(val)}`} />
                  ))}
                {absenceRow && (
                  <BreakdownRow
                    label={absenceRow[0]}
                    value={`- Rs. ${fmt(absenceRow[1])}`}
                    valueClass="text-rose-600"
                  />
                )}
                <BreakdownRow
                  label={isNp ? 'कुल आमदानी' : 'Gross salary'}
                  value={`Rs. ${fmt(record.grossSalary + (record.dashainBonus || 0))}`}
                  bold
                />
              </div>

              {/* Deductions block */}
              <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {isNp ? 'कटौती' : 'Deductions'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {deductionRows
                  .filter(([, v]) => v > 0)
                  .map(([label, val]) => (
                    <BreakdownRow
                      key={label}
                      label={label}
                      value={`Rs. ${fmt(val)}`}
                      valueClass="text-rose-600"
                    />
                  ))}
                <BreakdownRow
                  label={isNp ? 'जम्मा कटौती' : 'Total deductions'}
                  value={`Rs. ${fmt(record.totalDeductions)}`}
                  bold
                  valueClass="text-rose-700"
                />
              </div>

              {/* Employer contribution block */}
              {(record.employerSsf > 0 || record.employerPf > 0) && (
                <>
                  <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      {isNp ? 'नियोक्ता योगदान' : 'Employer contribution'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {record.employerSsf > 0 && (
                      <BreakdownRow
                        label={`SSF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                        value={`Rs. ${fmt(record.employerSsf)}`}
                        valueClass="text-blue-600"
                      />
                    )}
                    {record.employerPf > 0 && (
                      <BreakdownRow
                        label={`PF (${isNp ? 'नियोक्ता' : 'Employer'})`}
                        value={`Rs. ${fmt(record.employerPf)}`}
                        valueClass="text-blue-600"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Net salary block */}
              <div className="flex items-center justify-between border-t border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-sm font-bold text-emerald-900">
                  {isNp ? 'खुद तलब' : 'Net salary'}
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  Rs. {fmt(record.netSalary)}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </h4>
      {children}
    </div>
  )
}

function StatBox({
  label,
  value,
  className = 'bg-slate-50',
  valueClass = 'text-slate-900',
}: {
  label: string
  value: number
  className?: string
  valueClass?: string
}) {
  return (
    <div className={`${className} rounded-lg p-2 text-center`}>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}

function LineItem({
  label,
  value,
  bold,
  separator,
  valueClass = 'text-slate-900',
}: {
  label: string
  value: string
  bold?: boolean
  separator?: boolean
  valueClass?: string
}) {
  return (
    <div
      className={`flex justify-between py-0.5 ${separator ? 'mt-1 border-t border-slate-200 pt-1.5' : ''}`}
    >
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  bold,
  valueClass = 'text-slate-700',
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className={`flex justify-between px-4 py-2 ${bold ? 'bg-slate-50' : ''}`}>
      <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={`font-medium ${bold ? 'text-slate-900' : valueClass}`}>{value}</span>
    </div>
  )
}
