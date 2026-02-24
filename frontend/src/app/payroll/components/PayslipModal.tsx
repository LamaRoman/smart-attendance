'use client';

import { X, Eye, Download } from 'lucide-react';
import { PayrollRecord } from '../types';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils';

interface Props {
  record: PayrollRecord;
  isNp: boolean;
  isStarter: boolean;
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function PayslipModal({ record, isNp, isStarter, onClose, onError }: Props) {
  const monthLabel = isNp
    ? BS_MONTHS_NP[record.bsMonth - 1]
    : BS_MONTHS_EN[record.bsMonth - 1];

  const pdfUrl = `${API_BASE}/api/payroll/payslip/${record.id}/pdf`;

  const handleDownload = async () => {
    const res = await fetch(pdfUrl, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!res.ok) { onError('Download failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${record.user?.employeeId || ''}-${record.bsYear}-${record.bsMonth}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isNp ? 'à¤ªà¥‡-à¤¸à¥à¤²à¤¿à¤ª' : 'Payslip'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.user?.firstName} {record.user?.lastName} â€” {monthLabel} {record.bsYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              {isNp ? 'à¤ªà¥‚à¤°à¥à¤µà¤¾à¤µà¤²à¥‹à¤•à¤¨' : 'Preview'}
            </button>
            <button
              disabled={isStarter}
              onClick={handleDownload}
              title={isStarter ? (isNp ? 'Operations à¤ªà¥à¤²à¤¾à¤¨ à¤†à¤µà¤¶à¥à¤¯à¤• à¤›' : 'Requires Operations plan') : undefined}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isStarter && (
                <span className="px-1 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-800 rounded">
                  PRO
                </span>
              )}
              <Download className="w-3.5 h-3.5" />
              {isNp ? 'à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Attendance */}
          <Section label={isNp ? 'à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤à¤¿' : 'Attendance'}>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              <StatBox label={isNp ? 'à¤•à¤¾à¤°à¥à¤¯ à¤¦à¤¿à¤¨' : 'Working'} value={record.workingDaysInMonth} />
              <StatBox label={isNp ? 'à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤' : 'Present'} value={record.daysPresent} className="bg-emerald-50" valueClass="text-emerald-700" />
              <StatBox label={isNp ? 'à¤…à¤¨à¥à¤ªà¤¸à¥à¤¥à¤¿à¤¤' : 'Absent'} value={record.daysAbsent} className="bg-rose-50" valueClass="text-rose-700" />
              {(record as any).paidLeaveDays > 0 && (
                <StatBox label={isNp ? 'à¤¸à¤¶à¥à¤²à¥à¤• à¤¬à¤¿à¤¦à¤¾' : 'Paid leave'} value={(record as any).paidLeaveDays} className="bg-blue-50" valueClass="text-blue-700" />
              )}
              {(record as any).unpaidLeaveDays > 0 && (
                <StatBox label={isNp ? 'à¤¬à¤¿à¤¨à¤¾ à¤¤à¤²à¤¬ à¤¬à¤¿à¤¦à¤¾' : 'Unpaid leave'} value={(record as any).unpaidLeaveDays} className="bg-amber-50" valueClass="text-amber-700" />
              )}
            </div>
          </Section>

          {/* Earnings */}
          <Section label={isNp ? 'à¤†à¤®à¥à¤¦à¤¾à¤¨à¥€' : 'Earnings'}>
            <div className="space-y-1 text-xs">
              {([
                [isNp ? 'à¤†à¤§à¤¾à¤°à¤­à¥‚à¤¤ à¤¤à¤²à¤¬' : 'Basic salary',     record.basicSalary],
                [isNp ? 'à¤®à¤¹à¤à¤—à¥€ à¤­à¤¤à¥à¤¤à¤¾'  : 'DA',              record.dearnessAllowance],
                [isNp ? 'à¤¯à¤¾à¤¤à¤¾à¤¯à¤¾à¤¤ à¤­à¤¤à¥à¤¤à¤¾': 'Transport',        record.transportAllowance],
                [isNp ? 'à¤šà¤¿à¤•à¤¿à¤¤à¥à¤¸à¤¾ à¤­à¤¤à¥à¤¤à¤¾': 'Medical',        record.medicalAllowance],
                [isNp ? 'à¤…à¤¨à¥à¤¯ à¤­à¤¤à¥à¤¤à¤¾'   : 'Other',           record.otherAllowances],
                [isNp ? 'à¤“à¤­à¤°à¤Ÿà¤¾à¤‡à¤®'      : 'Overtime',        record.overtimePay],
                ...(record.dashainBonus > 0
                  ? [[isNp ? 'à¤¦à¤¶à¥ˆà¤‚ à¤¬à¥‹à¤¨à¤¸' : 'Dashain bonus', record.dashainBonus]]
                  : []),
              ] as [string, number][])
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem key={label} label={label} value={`Rs. ${fmt(val)}`} />
                ))}
              <LineItem
                label={isNp ? 'à¤•à¥à¤² à¤†à¤®à¥à¤¦à¤¾à¤¨à¥€' : 'Gross salary'}
                value={`Rs. ${fmt(record.grossSalary + (record.dashainBonus || 0))}`}
                bold
                separator
              />
            </div>
          </Section>

          {/* Deductions */}
          <Section label={isNp ? 'à¤•à¤Ÿà¥Œà¤¤à¥€' : 'Deductions'}>
            <div className="space-y-1 text-xs">
              {([
                [isNp ? 'à¤…à¤¨à¥à¤ªà¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤•à¤Ÿà¥Œà¤¤à¥€' : 'Absence deduction', record.absenceDeduction],
                [`SSF (${isNp ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€' : 'Employee'})`,        record.employeeSsf],
                [`PF (${isNp ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€' : 'Employee'})`,         record.employeePf],
                ['CIT',                                             record.citDeduction],
                ['TDS',                                             record.tds],
                [isNp ? 'à¤ªà¥‡à¤¶à¤—à¥€ à¤•à¤Ÿà¥Œà¤¤à¥€' : 'Advance',                record.advanceDeduction],
              ] as [string, number][])
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <LineItem key={label} label={label} value={`Rs. ${fmt(val)}`} valueClass="text-rose-600" />
                ))}
              <LineItem
                label={isNp ? 'à¤œà¤®à¥à¤®à¤¾ à¤•à¤Ÿà¥Œà¤¤à¥€' : 'Total deductions'}
                value={`Rs. ${fmt(record.totalDeductions)}`}
                bold
                separator
                valueClass="text-rose-700"
              />
            </div>
          </Section>

          {/* Employer contribution */}
          {(record.employerSsf > 0 || record.employerPf > 0) && (
            <Section label={isNp ? 'à¤¨à¤¿à¤¯à¥‹à¤•à¥à¤¤à¤¾ à¤¯à¥‹à¤—à¤¦à¤¾à¤¨' : 'Employer contribution'}>
              <div className="space-y-1 text-xs">
                {record.employerSsf > 0 && (
                  <LineItem
                    label={`SSF (${isNp ? 'à¤¨à¤¿à¤¯à¥‹à¤•à¥à¤¤à¤¾' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerSsf)}`}
                    valueClass="text-blue-600"
                  />
                )}
                {record.employerPf > 0 && (
                  <LineItem
                    label={`PF (${isNp ? 'à¤¨à¤¿à¤¯à¥‹à¤•à¥à¤¤à¤¾' : 'Employer'})`}
                    value={`Rs. ${fmt(record.employerPf)}`}
                    valueClass="text-blue-600"
                  />
                )}
              </div>
            </Section>
          )}

          {/* Net */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900">
                {isNp ? 'à¤–à¥à¤¦ à¤¤à¤²à¤¬' : 'Net salary'}
              </span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Rs. {fmt(record.netSalary)}
              </span>
            </div>
            {record.isMarried && (
              <p className="text-[10px] text-slate-500 mt-1">
                {isNp ? '* à¤µà¤¿à¤µà¤¾à¤¹à¤¿à¤¤ à¤•à¤° à¤¸à¥à¤²à¥à¤¯à¤¾à¤¬ à¤²à¤¾à¤—à¥‚' : '* Married tax slab applied'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ Sub-components â”€â”€ */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </h4>
      {children}
    </div>
  );
}

function StatBox({
  label, value, className = 'bg-slate-50', valueClass = 'text-slate-900',
}: {
  label: string; value: number; className?: string; valueClass?: string;
}) {
  return (
    <div className={`${className} rounded-lg p-2 text-center`}>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function LineItem({
  label, value, bold, separator, valueClass = 'text-slate-900',
}: {
  label: string; value: string;
  bold?: boolean; separator?: boolean; valueClass?: string;
}) {
  return (
    <div
      className={`flex justify-between py-0.5 ${separator ? 'border-t border-slate-200 mt-1 pt-1.5' : ''}`}
    >
      <span className={`${bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</span>
      <span className={`font-medium ${bold ? valueClass : valueClass}`}>{value}</span>
    </div>
  );
}
