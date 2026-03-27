'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { LeaveBalance } from '../types';

interface Props {
  balance: LeaveBalance;
  bsYear: number;
  isNepali: boolean;
  onSave: (adjustments: Record<string, number>, note: string) => Promise<void>;
  onClose: () => void;
}

export default function AdjustBalanceModal({ balance, bsYear, isNepali, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    annualEntitlement: balance.annualEntitlement,
    sickEntitlement:   balance.sickEntitlement,
    casualEntitlement: balance.casualEntitlement,
    annualCarriedOver: balance.annualCarriedOver,
    sickCarriedOver:   balance.sickCarriedOver,
    annualUsed:        balance.annualUsed,
    sickUsed:          balance.sickUsed,
    casualUsed:        balance.casualUsed,
  });
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (key: string, val: number) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!note.trim() || note.trim().length < 3) {
      setErr(isNepali ? 'कम्तिमा ३ अक्षरको नोट आवश्यक छ' : 'Note is required (min 3 characters)');
      return;
    }
    setSaving(true);
    setErr('');
    await onSave(form, note.trim());
    setSaving(false);
  };

  const Field = ({
    label, fieldKey, max,
  }: { label: string; fieldKey: string; max: number }) => (
    <div>
      <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
      <input
        type="number" min="0" max={max}
        value={(form as any)[fieldKey]}
        onChange={(e) => set(fieldKey, parseInt(e.target.value) || 0)}
        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isNepali ? 'ब्यालेन्स सम्पादन' : 'Adjust Balance'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {balance.membership.user.firstName} {balance.membership.user.lastName} · {bsYear}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {err && (
          <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{err}</p>
        )}

        <div className="space-y-3">
          {/* Annual */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              {isNepali ? 'वार्षिक बिदा' : 'Annual Leave'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Field label={isNepali ? 'अधिकार' : 'Entitlement'} fieldKey="annualEntitlement" max={90} />
              <Field label={isNepali ? 'ल्याइएको' : 'Carried Over'}  fieldKey="annualCarriedOver"  max={90} />
              <Field label={isNepali ? 'प्रयोग' : 'Used'}          fieldKey="annualUsed"          max={90} />
            </div>
          </div>

          {/* Sick */}
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 space-y-2">
            <p className="text-xs font-semibold text-rose-800">
              {isNepali ? 'बिरामी बिदा' : 'Sick Leave'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Field label={isNepali ? 'अधिकार' : 'Entitlement'} fieldKey="sickEntitlement" max={45} />
              <Field label={isNepali ? 'ल्याइएको' : 'Carried Over'}  fieldKey="sickCarriedOver"  max={45} />
              <Field label={isNepali ? 'प्रयोग' : 'Used'}          fieldKey="sickUsed"          max={45} />
            </div>
          </div>

          {/* Casual */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
            <p className="text-xs font-semibold text-blue-800">
              {isNepali ? 'आकस्मिक बिदा' : 'Casual Leave'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label={isNepali ? 'अधिकार' : 'Entitlement'} fieldKey="casualEntitlement" max={60} />
              <Field label={isNepali ? 'प्रयोग' : 'Used'}         fieldKey="casualUsed"         max={60} />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isNepali ? 'कारण (आवश्यक)' : 'Reason (required)'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isNepali ? 'सम्पादनको कारण...' : 'Reason for adjustment...'}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving
              ? isNepali ? 'सेभ हुँदैछ...' : 'Saving...'
              : isNepali ? 'सेभ गर्नुहोस्' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}