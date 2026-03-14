'use client';

import { Clock, FileText, Eye, Download } from 'lucide-react';
import { PayrollRecord, STATUS_COLORS } from '../types';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt, API_BASE } from '../utils';
import { t, Language } from '@/lib/i18n';

interface Props {
  language: Language;
  isStarter: boolean;
  userRole?: string;
  featurePayrollWorkflow: boolean;
  recYear: number;
  recMonth: number;
  records: PayrollRecord[];
  loadingRecords: boolean;
  onSetYear: (y: number) => void;
  onSetMonth: (m: number) => void;
  onLoad: () => void;
  onBulkStatus: (status: string) => void;
  onViewPayslip: (r: PayrollRecord) => void;
}

const YEARS = [2081, 2082, 2083];

export default function RecordsTab({
  language, isStarter, userRole, featurePayrollWorkflow,
  recYear, recMonth, records, loadingRecords,
  onSetYear, onSetMonth, onLoad, onBulkStatus, onViewPayslip,
}: Props) {
  const lang = language;
  const isAccountant = userRole === 'ORG_ACCOUNTANT';
  const isNp = language === 'NEPALI';

  // Derive month-level state from actual record statuses
  const hasPaid      = records.some((r) => r.status === 'PAID');
  const allPaid      = records.length > 0 && records.every((r) => r.status === 'PAID');
  const allApproved  = records.length > 0 && records.every((r) => r.status === 'APPROVED');
  const allProcessed = records.length > 0 && records.every((r) => r.status === 'PROCESSED');
  const hasDraft     = records.some((r) => r.status === 'DRAFT' || r.status === 'NEEDS_RECALCULATION');

  // Button visibility — mirrors backend ROLE_TRANSITIONS exactly
  const showProcess = featurePayrollWorkflow && hasDraft && !hasPaid;
  const showApprove = featurePayrollWorkflow && !isAccountant && allProcessed;
  const showPaid    = featurePayrollWorkflow && allApproved;

  const handleBankCsv = async () => {
    const res = await fetch(
      `${API_BASE}/api/payroll/export/bank-sheet?bsYear=${recYear}&bsMonth=${recMonth}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-salary-sheet-${recYear}-${recMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {t('payroll.records', lang)}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={recYear}
              onChange={(e) => { onSetYear(Number(e.target.value)); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={recMonth}
              onChange={(e) => { onSetMonth(Number(e.target.value)); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              {BS_MONTHS_NP.map((m, i) => (
                <option key={i} value={i + 1}>{lang === 'NEPALI' ? m : BS_MONTHS_EN[i]}</option>
              ))}
            </select>

            {records.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">

                {/* PAID badge — month is fully locked */}
                {allPaid && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                    ✓ {lang === 'NEPALI' ? 'भुक्तानी भयो' : 'Month fully paid'}
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

                {/* Pending approval notice for accountant */}
                {isAccountant && allProcessed && (
                  <span className="text-xs text-amber-600 font-medium px-2">
                    {lang === 'NEPALI' ? '⏳ प्रशासकको स्वीकृति पर्खिँदैछ' : '⏳ Awaiting admin approval'}
                  </span>
                )}

                <button
                  disabled={isStarter}
                  onClick={handleBankCsv}
                  title={isStarter ? t('common.opsRequired', lang) : undefined}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-50"
                >
                  {isStarter && (
                    <span className="px-1 py-0.5 text-[8px] font-semibold bg-amber-200 text-amber-800 rounded">
                      PRO
                    </span>
                  )}
                  <Download className="w-3 h-3" />
                  {lang === 'NEPALI' ? 'बैंक CSV' : 'Bank CSV'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loadingRecords ? (
        <LoadingCard lang={lang} />
      ) : records.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {[
                    { label: t('payroll.employee', lang), align: 'left'   },
                    { label: t('common.days', lang),      align: 'center' },
                    { label: t('payroll.gross', lang),    align: 'right'  },
                    { label: 'SSF',                       align: 'right'  },
                    { label: 'PF',                        align: 'right'  },
                    { label: 'TDS',                       align: 'right'  },
                    { label: t('payroll.net', lang),      align: 'right'  },
                    { label: t('common.status', lang),    align: 'center' },
                    { label: '',                          align: 'center' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-${h.align}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">
                        {r.user?.firstName} {r.user?.lastName}
                      </div>
                     <div className="text-xs text-slate-400">{r.user?.employeeId}</div>
                      {r.regeneratedFromPaid && (
                        <div className="text-[10px] text-rose-600 font-medium mt-0.5" title={r.overrideReason || ''}>
                          ⚠ {isNp ? 'भुक्तानी पछि परिवर्तन' : 'Overridden after payment'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-emerald-600 font-medium">{r.daysPresent}</span>
                      <span className="text-slate-300">/{r.workingDaysInMonth}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(r.grossSalary)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.employeeSsf)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.employeePf)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.tds)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-medium ${STATUS_COLORS[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onViewPayslip(r)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {t('common.noRecord', lang)}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'NEPALI' ? 'पहिले तलब गणना गर्नुहोस्' : 'Generate payroll first'}
          </p>
        </div>
      )}
    </div>
  );
}

function WorkflowButton({
  label, onClick, className,
}: {
  label: string; onClick: () => void; className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${className}`}
    >
      {label}
    </button>
  );
}

function LoadingCard({ lang }: { lang: Language }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Clock className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
      <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
    </div>
  );
}