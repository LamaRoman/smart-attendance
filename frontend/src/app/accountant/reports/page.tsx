'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AccountantLayout from '@/components/AccountantLayout';
import { t, Language } from '@/lib/i18n';
import { api } from '@/lib/api';
import {
  FileText, Download, Calendar, TrendingUp,
  DollarSign, Clock, AlertCircle, BarChart3,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const BS_MONTHS_EN = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const BS_MONTHS_NP = ['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पौष','माघ','फाल्गुन','चैत्र'];
const YEARS = [2080, 2081, 2082, 2083];

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type TabKey = 'monthly' | 'annual';

export default function AccountantReportsPage() {
  const { language } = useAuth();
  const lang = language as Language;

  const now = new Date();
  const currentBsYear = now.getMonth() >= 3 ? now.getFullYear() + 57 : now.getFullYear() + 56;

  const [activeTab,    setActiveTab]    = useState<TabKey>('monthly');
  const [error,        setError]        = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);

  // Monthly
  const [monthYear,    setMonthYear]    = useState(currentBsYear);
  const [monthMonth,   setMonthMonth]   = useState(1);
  const [monthData,    setMonthData]    = useState<any>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Annual
  const [annualYear,    setAnnualYear]    = useState(currentBsYear);
  const [annualData,    setAnnualData]    = useState<any>(null);
  const [loadingAnnual, setLoadingAnnual] = useState(false);

  const loadMonthly = async () => {
    setLoadingMonth(true); setError('');
    try {
      const res = await api.get(`/api/payroll/records?bsYear=${monthYear}&bsMonth=${monthMonth}`);
      if (res.error) throw new Error(res.error.message);
      setMonthData(res.data);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoadingMonth(false); }
  };

  const loadAnnual = async () => {
    setLoadingAnnual(true); setError('');
    try {
      const res = await api.get(`/api/payroll/annual?bsYear=${annualYear}`);
      if (res.error) throw new Error(res.error.message);
      setAnnualData(res.data);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoadingAnnual(false); }
  };

  const exportCsv = async (type: 'monthly' | 'annual') => {
    setExportingCsv(true);
    try {
      const url = type === 'monthly'
        ? `${API_URL}/api/payroll/export/monthly?bsYear=${monthYear}&bsMonth=${monthMonth}`
        : `${API_URL}/api/payroll/annual/export?bsYear=${annualYear}`;
      const res = await fetch(url, {
        credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = type === 'monthly'
        ? `payroll-${monthYear}-${monthMonth}.csv`
        : `annual-tax-${annualYear}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) { setError(e.message); }
    finally { setExportingCsv(false); }
  };

  const records: any[]         = monthData?.records || monthData || [];
  const annualEmployees: any[] = annualData?.employees || [];
  const monthLabel = lang === 'NEPALI' ? BS_MONTHS_NP[monthMonth - 1] : BS_MONTHS_EN[monthMonth - 1];

  return (
    <AccountantLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('reports.title', lang)}</h1>
            <p className="text-xs text-slate-500">
              {lang === 'NEPALI' ? 'पढ्ने मात्र — सम्पादन अनुमति छैन' : 'Read-only — no edit permissions'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {([
            { key: 'monthly' as TabKey, label: lang === 'NEPALI' ? 'मासिक प्रतिवेदन' : 'Monthly Report', icon: Calendar    },
            { key: 'annual'  as TabKey, label: t('payroll.annualReport', lang),                            icon: TrendingUp  },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* ── Monthly Tab ── */}
        {activeTab === 'monthly' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-1">
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
                    <label className="block text-xs text-slate-500 mb-1">{t('date.year', lang)}</label>
                    <select value={monthYear} onChange={(e) => setMonthYear(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t('date.month', lang)}</label>
                    <select value={monthMonth} onChange={(e) => setMonthMonth(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                      {BS_MONTHS_EN.map((m, i) => (
                        <option key={i} value={i + 1}>
                          {lang === 'NEPALI' ? BS_MONTHS_NP[i] : m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={loadMonthly} disabled={loadingMonth}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
                    <FileText className="w-4 h-4" />
                    {loadingMonth ? t('common.loading', lang) : t('common.view', lang)}
                  </button>
                  {records.length > 0 && (
                    <button onClick={() => exportCsv('monthly')} disabled={exportingCsv}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                      <Download className="w-3.5 h-3.5" />
                      {t('common.export', lang)} CSV
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingMonth && <LoadingCard lang={lang} />}

            {!loadingMonth && records.length > 0 && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: lang === 'NEPALI' ? 'कर्मचारी'    : 'Employees',        value: String(records.length),                                                    color: 'blue'    as const },
                    { label: lang === 'NEPALI' ? 'जम्मा कुल'   : 'Total Gross',      value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.grossSalary,    0))}`, color: 'slate'   as const },
                    { label: lang === 'NEPALI' ? 'जम्मा कटौती' : 'Total Deductions', value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.totalDeductions, 0))}`, color: 'rose'    as const },
                    { label: lang === 'NEPALI' ? 'जम्मा खुद'   : 'Total Net',        value: `Rs. ${fmt(records.reduce((s: number, r: any) => s + r.netSalary,       0))}`, color: 'emerald' as const },
                  ].map((card) => (
                    <SummaryCard key={card.label} {...card} sub={`${monthLabel} ${monthYear}`} />
                  ))}
                </div>

                {/* Monthly table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthLabel} {monthYear} — {lang === 'NEPALI' ? 'तलब विवरण' : 'Payroll Details'}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          {[
                            [t('payroll.employee',   lang), 'left'],
                            [t('payroll.basic',      lang), 'right'],
                            [t('payroll.allowances', lang), 'right'],
                            [t('payroll.gross',      lang), 'right'],
                            ['SSF',                         'right'],
                            ['PF',                          'right'],
                            ['TDS',                         'right'],
                            [t('payroll.deductions', lang), 'right'],
                            [t('payroll.netSalary',  lang), 'right'],
                            [t('common.status',      lang), 'center'],
                          ].map(([label, align]) => (
                            <th key={label} className={`text-${align} py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider`}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map((r: any) => {
                          const allowances = (r.dearnessAllowance || 0) + (r.transportAllowance || 0) + (r.medicalAllowance || 0) + (r.otherAllowances || 0);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="text-sm font-medium text-slate-900">{r.user?.firstName} {r.user?.lastName}</div>
                                <div className="text-xs text-slate-400">{r.user?.employeeId}</div>
                              </td>
                              <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(r.basicSalary)}</td>
                              <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(allowances)}</td>
                              <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">{fmt(r.grossSalary)}</td>
                              <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.employeeSsf || 0)}</td>
                              <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.employeePf  || 0)}</td>
                              <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.tds         || 0)}</td>
                              <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.totalDeductions)}</td>
                              <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">{r.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                          <td className="py-3 px-4 text-sm">{t('common.total', lang)}</td>
                          <td className="py-3 px-4 text-right text-sm">{fmt(records.reduce((s: number, r: any) => s + r.basicSalary,     0))}</td>
                          <td className="py-3 px-4 text-right text-sm">--</td>
                          <td className="py-3 px-4 text-right text-sm">{fmt(records.reduce((s: number, r: any) => s + r.grossSalary,    0))}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(records.reduce((s: number, r: any) => s + (r.employeeSsf || 0), 0))}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(records.reduce((s: number, r: any) => s + (r.employeePf  || 0), 0))}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(records.reduce((s: number, r: any) => s + (r.tds         || 0), 0))}</td>
                          <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(records.reduce((s: number, r: any) => s + r.totalDeductions,   0))}</td>
                          <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(records.reduce((s: number, r: any) => s + r.netSalary, 0))}</td>
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-1">
                    {t('payroll.annualReport', lang)}
                  </h2>
                  <p className="text-xs text-slate-500">{t('payroll.annualReportDesc', lang)}</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t('date.year', lang)}</label>
                    <select value={annualYear} onChange={(e) => setAnnualYear(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button onClick={loadAnnual} disabled={loadingAnnual}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
                    <FileText className="w-4 h-4" />
                    {loadingAnnual ? t('common.loading', lang) : t('payroll.viewReport', lang)}
                  </button>
                  {annualEmployees.length > 0 && (
                    <button onClick={() => exportCsv('annual')} disabled={exportingCsv}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                      <Download className="w-3.5 h-3.5" />
                      {t('common.export', lang)} CSV
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingAnnual && <LoadingCard lang={lang} />}

            {!loadingAnnual && annualEmployees.length > 0 && (
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
                        {[
                          [t('payroll.employee',    lang), 'left'],
                          [t('payroll.annualBasic', lang), 'right'],
                          [t('payroll.annualGross', lang), 'right'],
                          ['SSF',                          'right'],
                          ['PF',                           'right'],
                          ['TDS',                          'right'],
                          [t('payroll.deductions',  lang), 'right'],
                          [t('payroll.annualNet',   lang), 'right'],
                        ].map(([label, align]) => (
                          <th key={label} className={`text-${align} py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider`}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {annualEmployees.map((emp: any) => (
                        <tr key={emp.userId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-slate-900">{emp.employee.firstName} {emp.employee.lastName}</div>
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
                    <tfoot>
                      <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                        <td className="py-3 px-4 text-sm">{t('common.total', lang)}</td>
                        <td className="py-3 px-4 text-right text-sm">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.basicSalary,     0))}</td>
                        <td className="py-3 px-4 text-right text-sm">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.grossSalary,    0))}</td>
                        <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.employeeSsf, 0))}</td>
                        <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.employeePf,  0))}</td>
                        <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.tds,         0))}</td>
                        <td className="py-3 px-4 text-right text-sm text-rose-700">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.totalDeductions, 0))}</td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(annualEmployees.reduce((s: number, e: any) => s + e.totals.netSalary, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {!loadingAnnual && annualData && annualEmployees.length === 0 && <EmptyCard lang={lang} />}
          </div>
        )}

      </div>
    </AccountantLayout>
  );
}

// ── Sub-components ──

function LoadingCard({ lang }: { lang: Language }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Clock className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('common.loading', lang)}</p>
    </div>
  );
}

function EmptyCard({ lang }: { lang: Language }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('common.noData', lang)}</p>
    </div>
  );
}

const CARD_STYLES = {
  blue:    { wrap: 'bg-blue-50 border-blue-200',       val: 'text-blue-900',    sub: 'text-blue-600',    icon: <DollarSign className="w-4 h-4 text-blue-500"   /> },
  slate:   { wrap: 'bg-slate-50 border-slate-200',     val: 'text-slate-900',   sub: 'text-slate-500',   icon: <DollarSign className="w-4 h-4 text-slate-500"  /> },
  rose:    { wrap: 'bg-rose-50 border-rose-200',       val: 'text-rose-900',    sub: 'text-rose-600',    icon: <TrendingUp className="w-4 h-4 text-rose-500"   /> },
  emerald: { wrap: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-900', sub: 'text-emerald-600', icon: <DollarSign className="w-4 h-4 text-emerald-500"/> },
};

function SummaryCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: keyof typeof CARD_STYLES;
}) {
  const s = CARD_STYLES[color];
  return (
    <div className={`${s.wrap} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${s.sub}`}>{label}</span>
        {s.icon}
      </div>
      <p className={`text-lg font-bold ${s.val}`}>{value}</p>
      <p className={`text-xs ${s.sub} mt-1`}>{sub}</p>
    </div>
  );
}