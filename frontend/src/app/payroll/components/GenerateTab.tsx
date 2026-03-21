'use client';

import { useState, useEffect } from 'react';
import { Play, Lock, AlertTriangle } from 'lucide-react';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt } from '../utils';
import { STATUS_COLORS } from '../types';
import { api } from '@/lib/api';

interface Employee {
  membershipId: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
}

interface Props {
  isNp: boolean;
  genYear: number;
  genMonth: number;
  generating: boolean;
  genResult: any;
  onSetYear: (y: number) => void;
  onSetMonth: (m: number) => void;
  userRole?: string;
  onGenerate: (overrides: Record<string, number>, reason?: string) => void;
}

const YEARS = [2081, 2082, 2083];

export default function GenerateTab({
  isNp, genYear, genMonth, generating, genResult,
  userRole, onSetYear, onSetMonth, onGenerate,
}: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overtimeOverrides, setOvertimeOverrides] = useState<Record<string, string>>({});
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Fetch employees with pay settings on mount
  useEffect(() => {
    api.get('/api/payroll/settings').then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setEmployees((res.data as any[]).map((e) => ({
          membershipId: e.membershipId,
          firstName: e.firstName,
          lastName: e.lastName,
          employeeId: e.employeeId,
        })));
      }
    });
  }, []);

  // Check if records already exist for selected month — disable generate if APPROVED or PAID
  useEffect(() => {
    let cancelled = false;
    setCheckingExisting(true);
    setExistingStatus(null);
    api.get(`/api/payroll/records?bsYear=${genYear}&bsMonth=${genMonth}`).then((res) => {
      if (cancelled) return;
      const records: any[] = (res.data as any)?.records || [];
      if (records.length === 0) {
        setExistingStatus(null);
      } else if (records.some((r) => r.status === 'PAID')) {
        setExistingStatus('PAID');
      } else if (records.some((r) => r.status === 'APPROVED')) {
        setExistingStatus('APPROVED');
      } else {
        // DRAFT or PROCESSED — regeneration allowed (backend handles it)
        setExistingStatus('REGENERATABLE');
      }
      setCheckingExisting(false);
    });
    return () => { cancelled = true; };
  }, [genYear, genMonth]);

  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const isAccountant = userRole === 'ORG_ACCOUNTANT';
  const isApprovedLock = existingStatus === 'APPROVED';
  const isPaidOverridable = existingStatus === 'PAID';
  const isLocked = isApprovedLock;

  const wordCount = overrideReason.trim().split(/\s+/).filter(Boolean).length;
  const reasonValid = wordCount >= 10;
  const handleGenerate = () => {
    const overrides: Record<string, number> = {};
    for (const [membershipId, val] of Object.entries(overtimeOverrides)) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && val.trim() !== '') {
        overrides[membershipId] = Math.max(0, parsed);
      }
    }
    onGenerate(overrides, isPaidOverridable ? overrideReason : undefined);
  };

  const setOverride = (membershipId: string, val: string) => {
    setOvertimeOverrides((prev) => ({ ...prev, [membershipId]: val }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          {isNp ? 'तलब गणना गर्नुहोस्' : 'Generate payroll'}
        </h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{isNp ? 'वर्ष' : 'Year'}</label>
            <select
              value={genYear}
              onChange={(e) => onSetYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{isNp ? 'महिना' : 'Month'}</label>
            <select
              value={genMonth}
              onChange={(e) => onSetMonth(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              {BS_MONTHS_NP.map((m, i) => (
                <option key={i} value={i + 1}>{isNp ? m : BS_MONTHS_EN[i]}</option>
              ))}
            </select>
          </div>
          <div className="pt-4">
            {isApprovedLock || (isPaidOverridable && isAccountant) ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                <Lock className="w-4 h-4" />
                {isNp ? 'स्वीकृत महिना — बन्द' : 'Month already approved — locked'}
              </div>
            ) : isPaidOverridable && !showOverrideForm ? (
              <button
                onClick={() => setShowOverrideForm(true)}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {isNp ? 'भुक्तानी भएको — ओभरराइड गर्नुहोस्' : 'Month paid — Override'}
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating || checkingExisting}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {generating
                  ? (isNp ? 'गणना हुँदैछ...' : 'Generating...')
                  : checkingExisting
                    ? (isNp ? 'जाँच गर्दैछ...' : 'Checking...')
                    : (isNp ? 'तलब गणना' : 'Generate')}
              </button>
            )}
          </div>
        </div>
        {/* Paid override form */}
        {isPaidOverridable && showOverrideForm && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  {isNp ? 'सावधानी: भुक्तानी भएको महिना ओभरराइड' : 'Warning: Overriding a paid month'}
                </p>
                <p className="text-xs text-rose-600 mt-0.5">
                  {isNp
                    ? 'यो महिनाको तलब पहिले नै भुक्तानी भइसकेको छ। पुनः गणना गर्नाले अघिल्लो रेकर्ड हटाउनेछ र अडिट ट्रेलमा राखिनेछ।'
                    : 'This month has already been paid. Regenerating will overwrite the existing records and create an audit trail entry.'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-rose-800">
                {isNp ? 'कारण (कम्तिमा १० शब्द आवश्यक)' : 'Reason (minimum 10 words required)'}
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder={isNp ? 'ओभरराइडको कारण विस्तारमा लेख्नुहोस्...' : 'Explain in detail why this paid month needs to be regenerated...'}
                className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white resize-none"
              />
              <p className={`text-xs ${reasonValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                {wordCount}/10 {isNp ? 'शब्द' : 'words'}{reasonValid ? ' ✓' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowOverrideForm(false); setOverrideReason(''); }}
                className="flex-1 px-4 py-2 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!reasonValid || generating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {generating
                  ? (isNp ? 'गणना हुँदैछ...' : 'Generating...')
                  : (isNp ? 'ओभरराइड र पुनः गणना' : 'Override & Regenerate')}
              </button>
            </div>
          </div>
        )}

        {/* Dashain bonus notice */}
        {genMonth === 6 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
            <span>🎉</span>
            {isNp
              ? 'आश्विन महिना — दशैं बोनस (१ महिनाको आधारभूत तलब) स्वचालित रूपमा थपिन्छ'
              : 'Ashwin month — Dashain bonus (1 month basic salary) will be added automatically'}
          </div>
        )}

        {/* Overtime override section */}
        {!isLocked && employees.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {isNp ? 'ओभरटाइम ओभरराइड (ऐच्छिक)' : 'Overtime override (optional)'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isNp
                    ? 'खाली छोड्नुहोस् = स्वचालित गणना। संख्या भर्नुहोस् = त्यही घण्टा प्रयोग हुनेछ।'

                    : 'Leave blank to use calculated hours. Enter a number to override for that employee.'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, string> = {};
                    employees.forEach((e) => { all[e.membershipId] = '0'; });
                    setOvertimeOverrides(all);
                  }}
                  className="px-3 py-1.5 text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  {isNp ? 'सबै ० मा सेट' : 'Set all to 0'}
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeOverrides({})}
                  className="px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {isNp ? 'सबै रिसेट' : 'Clear all'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {employees.map((emp) => (
                <div
                  key={emp.membershipId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    {emp.employeeId && (
                      <p className="text-[10px] text-slate-400">{emp.employeeId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={isNp ? 'स्वतः' : 'Auto'}
                      value={overtimeOverrides[emp.membershipId] ?? ''}
                      onChange={(e) => setOverride(emp.membershipId, e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white text-right"
                    />
                    <span className="text-[10px] text-slate-400">{isNp ? 'घण्टा' : 'hrs'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {genResult && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50">
            <h3 className="text-sm font-semibold text-emerald-800">
              {isNp ? 'गणना परिणाम' : 'Generation result'} —{' '}
              {isNp ? genResult.monthNameNp : genResult.monthNameEn} {genResult.bsYear}
            </h3>
            <p className="text-xs text-emerald-600 mt-0.5">
              {genResult.records?.length} {isNp ? 'कर्मचारी' : 'employees'} •{' '}
              {genResult.workingDaysInMonth} {isNp ? 'कार्य दिन' : 'working days'} •{' '}
              {genResult.holidaysInMonth} {isNp ? 'बिदा' : 'holidays'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {[
                    isNp ? 'कर्मचारी' : 'Employee',
                    isNp ? 'आधारभूत' : 'Basic',
                    isNp ? 'कुल आमदानी' : 'Gross',
                    isNp ? 'कटौती' : 'Deductions',
                    isNp ? 'खुद तलब' : 'Net',
                    isNp ? 'स्थिति' : 'Status',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${i === 0 ? 'text-left' : i === 5 ? 'text-center' : 'text-right'
                        }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(genResult.records || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">
                        {r.user?.firstName} {r.user?.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{r.user?.employeeId}</div>
                      {r.overtimeHours > 0 && (
                        <div className="text-[10px] text-amber-600">
                          {r.overtimeHours}h OT
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{fmt(r.basicSalary)}</td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">{fmt(r.grossSalary)}</td>
                    <td className="py-3 px-4 text-right text-sm text-rose-600">{fmt(r.totalDeductions)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-medium ${STATUS_COLORS[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}