'use client';

import { X, CalendarDays, CheckCircle } from 'lucide-react';
import BSDatePicker, { toNepaliDigits } from '@/components/BSDatePicker';
import { LEAVE_TYPES } from '../constants';
import { LeaveBalance } from '../types';

interface Props {
  isNepali: boolean;
  isNepaliCalendar: boolean;
  formData: { startDate: string; endDate: string; reason: string; type: string };
  loading: boolean;
  myBalance: LeaveBalance | null;
  onChange: (data: { startDate: string; endDate: string; reason: string; type: string }) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function RequestLeaveModal({
  isNepali, isNepaliCalendar, formData, loading, myBalance, onChange, onSubmit, onClose,
}: Props) {
  const durationDays =
    formData.startDate && formData.endDate
      ? Math.ceil(
          (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  // Balance available for the currently selected leave type
  const availableBalance =
    myBalance && formData.type === 'ANNUAL' ? myBalance.annualAvailable
    : myBalance && formData.type === 'SICK'   ? myBalance.sickAvailable
    : myBalance && formData.type === 'CASUAL' ? myBalance.casualAvailable
    : null;

  const isTrackedType = ['ANNUAL', 'SICK', 'CASUAL'].includes(formData.type);
  const showBalanceHint = myBalance !== null && isTrackedType && durationDays > 0 && availableBalance !== null;
  const balanceOk = availableBalance !== null && availableBalance >= durationDays;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-slate-200 mb-10">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100">
              <CalendarDays className="w-4 h-4 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Leave type selector */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              {isNepali ? 'बिदाको प्रकार' : 'Leave type'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map((type) => {
                const Icon       = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => onChange({ ...formData, type: type.value })}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-l-4 border border-slate-200 transition-all text-left
                      ${type.accent}
                      ${isSelected ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? type.iconColor : 'text-slate-400'}`} />
                    <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                      {isNepali ? type.label : type.labelEn}
                    </span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-900 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date pickers */}
          <div className="flex flex-col gap-4">
            {isNepaliCalendar ? (
              <>
                <BSDatePicker
                  label={isNepali ? 'सुरु मिति' : 'Start date'}
                  value={formData.startDate}
                  onChange={(v) => onChange({ ...formData, startDate: v })}
                  placeholder={isNepali ? 'सुरु मिति' : 'Start date'}
                />
                <BSDatePicker
                  label={isNepali ? 'अन्तिम मिति' : 'End date'}
                  value={formData.endDate}
                  onChange={(v) => onChange({ ...formData, endDate: v })}
                  min={formData.startDate}
                  placeholder={isNepali ? 'अन्तिम मिति' : 'End date'}
                />
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {isNepali ? 'सुरु मिति' : 'Start date'}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {isNepali ? 'अन्तिम मिति' : 'End date'}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </>
            )}
          </div>

          {/* Duration + Balance hint */}
          {durationDays > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <p className="text-xs text-slate-700 font-medium">
                {isNepali
                  ? `अवधि: ${toNepaliDigits(durationDays)} दिन`
                  : `Duration: ${durationDays} day(s)`}
              </p>
              {showBalanceHint && (
                <p className={`text-xs font-medium ${balanceOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {balanceOk
                    ? isNepali
                      ? `✓ पर्याप्त ब्यालेन्स (${availableBalance} दिन उपलब्ध)`
                      : `✓ Sufficient balance (${availableBalance} day(s) available)`
                    : isNepali
                      ? `⚠ ब्यालेन्स कम छ (${availableBalance} दिन मात्र उपलब्ध)`
                      : `⚠ Low balance (only ${availableBalance} day(s) available)`}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {isNepali ? 'कारण' : 'Reason'}
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => onChange({ ...formData, reason: e.target.value })}
              placeholder={isNepali ? 'बिदाको कारण...' : 'Brief reason for leave...'}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? isNepali ? 'पेश गर्दै...' : 'Submitting...'
                : isNepali ? 'पेश गर्नुहोस्' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}