'use client';

import { useState } from 'react';
import { Plus, RefreshCw, ChevronDown, CheckCircle, X, Users } from 'lucide-react';
import { LeaveBalance } from '../types';
import { CURRENT_BS_YEAR } from '../constants';

interface Props {
  isNepali: boolean;
  balances: LeaveBalance[];
  balanceLoading: boolean;
  balanceYear: number;
  onYearChange: (y: number) => void;
  onInitialize: (dryRun: boolean) => Promise<any>;
  onAdjust: (balance: LeaveBalance) => void;
}

function BalancePill({ available, total, color }: { available: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const barColor =
    available === 0 ? 'bg-rose-400' : available < total * 0.3 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="text-center">
      <span className={`text-sm font-semibold ${color}`}>{available}</span>
      <span className="text-xs text-slate-400"> / {total}</span>
      <div className="mt-1 h-1 w-16 bg-slate-100 rounded-full mx-auto overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const yearOptions = Array.from({ length: 4 }, (_, i) => CURRENT_BS_YEAR - 1 + i);

export default function LeaveBalanceTab({
  isNepali, balances, balanceLoading, balanceYear, onYearChange, onInitialize, onAdjust,
}: Props) {
  const [initLoading, setInitLoading] = useState(false);
  const [initPreview, setInitPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInit = async (dryRun: boolean) => {
    setInitLoading(true);
    const result = await onInitialize(dryRun);
    if (result && dryRun) {
      setInitPreview(result);
      setShowPreview(true);
    } else if (result && !dryRun) {
      setShowPreview(false);
      setInitPreview(null);
    }
    setInitLoading(false);
  };

  return (
    <div className="space-y-5">

      {/* Controls row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {isNepali ? 'वि.सं. वर्ष' : 'BS Year'}
            </label>
            <select
              value={balanceYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 md:ml-auto">
            <button
              onClick={() => handleInit(true)}
              disabled={initLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {isNepali ? 'पूर्वावलोकन' : 'Preview'}
            </button>
            <button
              onClick={() => handleInit(false)}
              disabled={initLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {initLoading
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Plus className="w-3.5 h-3.5" />}
              {isNepali ? `${balanceYear} सुरु गर्नुहोस्` : `Initialize ${balanceYear}`}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          {isNepali
            ? 'पहिले "पूर्वावलोकन" मा क्लिक गर्नुहोस् — के बन्नेछ हेर्नुहोस्, त्यसपछि मात्र "सुरु गर्नुहोस्" थिच्नुहोस्। पहिले नै सुरु भएका कर्मचारीहरू छोडिनेछन्।'
            : 'Click "Preview" first to see what will be created, then click "Initialize". Already-initialized employees will be skipped.'}
        </p>
      </div>

      {/* Preview Panel */}
      {showPreview && initPreview && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isNepali ? 'पूर्वावलोकन' : 'Preview'} — {balanceYear}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNepali
                  ? `${initPreview.created} नया, ${initPreview.skipped} छोडिने`
                  : `${initPreview.created} to create, ${initPreview.skipped} already initialized (will be skipped)`}
              </p>
            </div>
            <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-slate-200 rounded-lg">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-2.5 px-4 font-medium text-slate-400">
                    {isNepali ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="text-center py-2.5 px-3 font-medium text-slate-400">
                    {isNepali ? 'वार्षिक' : 'Annual'}
                  </th>
                  <th className="text-center py-2.5 px-3 font-medium text-slate-400">
                    {isNepali ? 'बिरामी' : 'Sick'}
                  </th>
                  <th className="text-center py-2.5 px-3 font-medium text-slate-400">
                    {isNepali ? 'आकस्मिक' : 'Casual'}
                  </th>
                  <th className="text-center py-2.5 px-3 font-medium text-slate-400">
                    {isNepali ? 'स्थिति' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initPreview.preview?.map((p: any) => (
                  <tr key={p.membershipId} className={p.skipped ? 'opacity-40' : ''}>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-slate-400">{p.employeeId}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      {p.annualEntitlement}
                      {p.annualCarriedOver > 0 && (
                        <span className="text-emerald-600"> +{p.annualCarriedOver}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      {p.sickEntitlement}
                      {p.sickCarriedOver > 0 && (
                        <span className="text-emerald-600"> +{p.sickCarriedOver}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{p.casualEntitlement}</td>
                    <td className="py-2.5 px-3 text-center">
                      {p.skipped ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                          {isNepali ? 'छोडिने' : 'Skip'}
                        </span>
                      ) : p.cappedWarning ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                          ⚠ {isNepali ? 'क्याप' : 'Capped'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">
                          {isNepali ? 'नया' : 'New'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {initPreview.created > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleInit(false)}
                disabled={initLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isNepali ? 'पुष्टि गर्नुहोस् र सुरु गर्नुहोस्' : 'Confirm & Initialize'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Balance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">
            {isNepali
              ? `${balanceYear} — कर्मचारी बिदा ब्यालेन्स`
              : `${balanceYear} — Employee Leave Balances`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isNepali
              ? 'उपलब्ध / जम्मा (हरियो: पर्याप्त, पहेंलो: थोरै, रातो: सकियो)'
              : 'Available / Total  ·  Green: sufficient, amber: low, red: exhausted'}
          </p>
        </div>

        {balanceLoading ? (
          <div className="py-14 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto" />
          </div>
        ) : balances.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {isNepali
                ? `${balanceYear} को लागि कुनै ब्यालेन्स भेटिएन`
                : `No balances found for ${balanceYear}`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isNepali
                ? 'माथिको "सुरु गर्नुहोस्" बटन थिच्नुहोस्'
                : 'Click "Initialize" above to create them'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNepali ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-amber-500 uppercase tracking-wider">
                    {isNepali ? 'वार्षिक' : 'Annual'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-rose-500 uppercase tracking-wider">
                    {isNepali ? 'बिरामी' : 'Sick'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-blue-500 uppercase tracking-wider">
                    {isNepali ? 'आकस्मिक' : 'Casual'}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNepali ? 'कारबाही' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900">
                        {b.membership.user.firstName} {b.membership.user.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{b.membership.employeeId}</p>
                    </td>
                    <td className="py-3 px-4">
                      <BalancePill
                        available={b.annualAvailable}
                        total={b.annualEntitlement + b.annualCarriedOver}
                        color="text-amber-700"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <BalancePill
                        available={b.sickAvailable}
                        total={b.sickEntitlement + b.sickCarriedOver}
                        color="text-rose-700"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <BalancePill
                        available={b.casualAvailable}
                        total={b.casualEntitlement}
                        color="text-blue-700"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onAdjust(b)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        {isNepali ? 'सम्पादन' : 'Adjust'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}