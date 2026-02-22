'use client';

import { Play } from 'lucide-react';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt } from '../utils';
import { STATUS_COLORS } from '../types';

interface Props {
  isNp: boolean;
  genYear: number;
  genMonth: number;
  generating: boolean;
  genResult: any;
  onSetYear: (y: number) => void;
  onSetMonth: (m: number) => void;
  onGenerate: () => void;
}

const YEARS = [2081, 2082, 2083];

export default function GenerateTab({
  isNp, genYear, genMonth, generating, genResult,
  onSetYear, onSetMonth, onGenerate,
}: Props) {
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
            <button
              onClick={onGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {generating
                ? isNp ? 'गणना हुँदैछ...' : 'Generating...'
                : isNp ? 'तलब गणना' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Dashain bonus notice — month 6 = Ashwin */}
        {genMonth === 6 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
            <span>🎉</span>
            {isNp
              ? 'आश्विन महिना — दशैं बोनस (१ महिनाको आधारभूत तलब) स्वचालित रूपमा थपिन्छ'
              : 'Ashwin month — Dashain bonus (1 month basic salary) will be added automatically'}
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
                    isNp ? 'कुल आम्दानी' : 'Gross',
                    isNp ? 'कटौती' : 'Deductions',
                    isNp ? 'खुद तलब' : 'Net',
                    isNp ? 'स्थिति' : 'Status',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${
                        i === 0 ? 'text-left' : i === 5 ? 'text-center' : 'text-right'
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
