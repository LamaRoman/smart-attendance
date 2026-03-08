'use client';

import {
  Copy, Calculator, Info, AlertTriangle, ChevronDown,
  Banknote, Shield, Heart, Briefcase, Building, Users,
} from 'lucide-react';
import { PaySettings, LiveCalculation } from '../types';
import { BS_MONTHS_NP, BS_MONTHS_EN, fmt } from '../utils';

interface Props {
  isNp: boolean;
  readOnly:boolean;
  users: any[];
  allPaySettings: Record<string, any>;
  selectedUser: string;
  form: PaySettings;
  originalForm: PaySettings;
  hasUnsavedChanges: boolean;
  liveCalculation: LiveCalculation;
  tdsSlabs: any;
  showTdsInfo: boolean;
  showCopyDropdown: boolean;
  saving: boolean;
  onSelectUser: (id: string) => void;
  onFormChange: (f: PaySettings) => void;
  onSave: () => void;
  onCancel: () => void;
  onCopyFrom: (sourceId: string) => void;
  onSetShowTdsInfo: (v: boolean) => void;
  onSetShowCopyDropdown: (v: boolean) => void;
}

export default function SettingsTab({
  isNp,readOnly, users, allPaySettings, selectedUser, form, originalForm,
  hasUnsavedChanges, liveCalculation, tdsSlabs, showTdsInfo,
  showCopyDropdown, saving,
  onSelectUser, onFormChange, onSave, onCancel, onCopyFrom,
  onSetShowTdsInfo, onSetShowCopyDropdown,
}: Props) {
  const setField = (key: keyof PaySettings, val: any) =>
    onFormChange({ ...form, [key]: val });

  const numField = (key: keyof PaySettings, e: React.ChangeEvent<HTMLInputElement>) =>
    setField(key, e.target.value === '' ? 0 : Number(e.target.value));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Employee list ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            {isNp ? 'कर्मचारीहरू' : 'Employees'}
          </h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => onSelectUser(u.id)}
              className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                selectedUser === u.id ? 'bg-slate-100 border-l-2 border-slate-900' : ''
              }`}
            >
              <div className="text-sm font-medium text-slate-900">
                {u.firstName} {u.lastName}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{u.employeeId}</div>
              {allPaySettings[u.id] && (
                <span className="inline-flex items-center mt-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  ✓ {isNp ? 'कन्फिगर' : 'Configured'}
                </span>
              )}
            </button>
          ))}
          {users.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              {isNp ? 'कुनै कर्मचारी छैन' : 'No employees'}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings form ── */}
      <div className="lg:col-span-2 space-y-4">
        {selectedUser ? (
          <>
            {/* Copy from another employee */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {isNp ? 'अर्को कर्मचारीबाट प्रतिलिपि गर्नुहोस्' : 'Copy settings from another employee'}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => onSetShowCopyDropdown(!showCopyDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    {isNp ? 'छान्नुहोस्' : 'Select'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showCopyDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
                      {users
                        .filter((u) => u.id !== selectedUser && allPaySettings[u.id])
                        .map((u) => (
                          <button
                            key={u.id}
                            onClick={() => onCopyFrom(u.id)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm transition-colors"
                          >
                            <div className="font-medium text-slate-900">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-xs text-slate-400">{u.employeeId}</div>
                          </button>
                        ))}
                      {users.filter((u) => u.id !== selectedUser && allPaySettings[u.id]).length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">
                          {isNp ? 'कुनै पनि अन्य कन्फिगर छैन' : 'No other configured employees'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live calculation preview */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">
                  {isNp ? 'अनुमानित मासिक गणना' : 'Estimated monthly calculation'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">
                    {isNp ? 'कुल आम्दानी' : 'Gross'}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Rs. {fmt(liveCalculation.gross)}
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">SSF</div>
                  <div className="text-sm font-bold text-rose-600">
                    Rs. {fmt(liveCalculation.employeeSsf)}
                  </div>
                  <div className="text-[9px] text-slate-400">({form.employeeSsfRate}%)</div>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase">TDS</div>
                  <div className="text-sm font-bold text-rose-600">
                    Rs. {fmt(liveCalculation.tds)}
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <div className="text-[10px] text-emerald-600 uppercase font-semibold">
                    {isNp ? 'खुद तलब' : 'Net'}
                  </div>
                  <div className="text-base font-bold text-emerald-700">
                    Rs. {fmt(liveCalculation.net)}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                <Info className="w-3 h-3" />
                <span>
                  {isNp
                    ? 'यो एक अनुमान हो। वास्तविक गणनामा उपस्थिति र ओभरटाइम समावेश हुनेछ।'
                    : 'Estimate only — actual calculation includes attendance & overtime.'}
                </span>
              </div>
            </div>

            {/* TDS slabs (collapsible) */}
            {tdsSlabs && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => onSetShowTdsInfo(!showTdsInfo)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {isNp
                        ? `कर स्ल्याब (FY ${tdsSlabs.fiscalYear})`
                        : `Tax slabs (FY ${tdsSlabs.fiscalYear})`}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${showTdsInfo ? 'rotate-180' : ''}`}
                  />
                </button>
                {showTdsInfo && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-xs">
                        <span className="text-slate-400">{isNp ? 'अविवाहित' : 'Unmarried'}:</span>{' '}
                        <span className="font-medium text-slate-700">
                          Rs. {tdsSlabs.unmarriedFirstSlab?.toLocaleString('en-IN')} @ {tdsSlabs.firstSlabRate}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-400">{isNp ? 'विवाहित' : 'Married'}:</span>{' '}
                        <span className="font-medium text-slate-700">
                          Rs. {tdsSlabs.marriedFirstSlab?.toLocaleString('en-IN')} @ {tdsSlabs.firstSlabRate}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {tdsSlabs.slabs?.map((slab: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                        >
                          <span className="text-slate-500">{slab.label}</span>
                          <span className="font-medium text-slate-700">
                            {slab.limit === 0
                              ? isNp ? 'बाँकी' : 'Remaining'
                              : 'Rs. ' + slab.limit.toLocaleString('en-IN')}{' '}
                            → {slab.rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {isNp ? 'सुपर एडमिनद्वारा व्यवस्थित' : 'Managed by Super Admin'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Salary details ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-600" />
                {isNp ? 'तलब विवरण' : 'Salary details'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {([
                  ['basicSalary',        isNp ? 'आधारभूत तलब'    : 'Basic salary'],
                  ['dearnessAllowance',  isNp ? 'महँगी भत्ता'     : 'Dearness allowance'],
                  ['transportAllowance', isNp ? 'यातायात भत्ता'   : 'Transport allowance'],
                  ['medicalAllowance',   isNp ? 'चिकित्सा भत्ता'  : 'Medical allowance'],
                  ['otherAllowances',    isNp ? 'अन्य भत्ता'      : 'Other allowances'],
                  ['overtimeRatePerHour',isNp ? 'ओभरटाइम दर/घण्टा': 'OT rate/hour'],
                ] as [keyof PaySettings, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={(form as any)[key]}
                        onChange={(e) => numField(key, e)}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        Rs.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Statutory deductions ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-600" />
                {isNp ? 'वैधानिक कटौती' : 'Statutory deductions'}
              </h3>

              {/* SSF */}
              <SectionBlock
                title={isNp ? 'सामाजिक सुरक्षा कोष (SSF)' : 'Social Security Fund (SSF)'}
                enabled={form.ssfEnabled}
                onToggle={(v) => setField('ssfEnabled', v)}
                isNp={isNp}
              >
                <RateRow
                  label={isNp ? 'कर्मचारी दर' : 'Employee rate'}
                  value={form.employeeSsfRate}
                  onChange={(v) => setField('employeeSsfRate', v)}
                  preview={`Rs. ${fmt(liveCalculation.employeeSsf)}`}
                  previewClass="text-slate-400"
                />
                <RateRow
                  label={isNp ? 'नियोक्ता दर' : 'Employer rate'}
                  value={form.employerSsfRate}
                  onChange={(v) => setField('employerSsfRate', v)}
                  preview={`Rs. ${fmt(liveCalculation.employerSsf)}`}
                  previewClass="text-blue-500"
                />
              </SectionBlock>

              {/* PF */}
              <SectionBlock
                title={isNp ? 'भविष्य निधि (PF)' : 'Provident Fund (PF)'}
                enabled={form.pfEnabled}
                onToggle={(v) => setField('pfEnabled', v)}
                isNp={isNp}
              >
                <RateRow
                  label={isNp ? 'कर्मचारी दर' : 'Employee rate'}
                  value={form.employeePfRate}
                  onChange={(v) => setField('employeePfRate', v)}
                  preview={`Rs. ${fmt(liveCalculation.employeePf)}`}
                  previewClass="text-slate-400"
                />
                <RateRow
                  label={isNp ? 'नियोक्ता दर' : 'Employer rate'}
                  value={form.employerPfRate}
                  onChange={(v) => setField('employerPfRate', v)}
                  preview={`Rs. ${fmt(liveCalculation.employerPf)}`}
                  previewClass="text-blue-500"
                />
              </SectionBlock>

              {/* CIT */}
              <SectionBlock
                title={isNp ? 'नागरिक लगानी कोष (CIT)' : 'Citizen Investment Trust (CIT)'}
                enabled={form.citEnabled}
                onToggle={(v) => setField('citEnabled', v)}
                isNp={isNp}
              >
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isNp ? 'मासिक रकम' : 'Monthly amount'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.citAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setField('citAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rs.</span>
                  </div>
                </div>
              </SectionBlock>

              {/* TDS */}
              <SectionBlock
                title={isNp ? 'कर कटौती (TDS)' : 'Tax deduction (TDS)'}
                enabled={form.tdsEnabled}
                onToggle={(v) => setField('tdsEnabled', v)}
                isNp={isNp}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isMarried}
                    onChange={(e) => setField('isMarried', e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded focus:ring-slate-200"
                  />
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="text-xs text-slate-700">
                    {isNp
                      ? 'विवाहित (पहिलो स्ल्याब रु. ६,००,०००)'
                      : 'Married (first slab Rs. 6,00,000)'}
                  </span>
                </label>
              </SectionBlock>
            </div>

            {/* ── Advance / loan ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-600" />
                {isNp ? 'पेशगी / ऋण कटौती' : 'Advance / loan deduction'}
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'मासिक कटौती' : 'Monthly deduction'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.advanceDeduction}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setField('advanceDeduction', e.target.value === '' ? 0 : Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rs.</span>
                </div>
              </div>
            </div>

            {/* ── Bank details ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-600" />
                {isNp ? 'बैंक विवरण' : 'Bank details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  ['bankName',          isNp ? 'बैंकको नाम'        : 'Bank name'],
                  ['bankAccountName',   isNp ? 'खाताधारकको नाम'   : 'Account name'],
                  ['bankAccountNumber', isNp ? 'खाता नम्बर'        : 'Account number'],
                ] as [keyof PaySettings, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                    <input
                      type="text"
                      value={(form as any)[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Save / Cancel ── */}
            <div className="flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={saving || !hasUnsavedChanges}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? isNp ? 'सुरक्षित गर्दै...' : 'Saving...'
                  : isNp ? 'सुरक्षित गर्नुहोस्' : 'Save settings'}
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
              )}
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400">
                💡 {isNp ? 'Ctrl+S थिच्नुहोस् सुरक्षित गर्न' : 'Press Ctrl+S to save quickly'}
              </span>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {isNp ? 'कर्मचारी छान्नुहोस्' : 'Select an employee'}
            </h3>
            <p className="text-xs text-slate-500">
              {isNp ? 'बायाँबाट कर्मचारी छान्नुहोस्' : 'Choose an employee from the left'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small reusable sub-components ── */

function SectionBlock({
  title, enabled, onToggle, isNp, children,
}: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void;
  isNp: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-900">{title}</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 text-slate-900 rounded focus:ring-slate-200"
          />
          <span className="text-xs text-slate-500">
            {enabled
              ? isNp ? 'सक्रिय' : 'Enabled'
              : isNp ? 'निष्क्रिय' : 'Disabled'}
          </span>
        </label>
      </div>
      {enabled && <div className="grid grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

function RateRow({
  label, value, onChange, preview, previewClass,
}: {
  label: string; value: number;
  onChange: (v: number) => void;
  preview: string; previewClass: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          min="0"
          max="100"
          step="0.1"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
      </div>
      <div className={`text-[10px] mt-0.5 ${previewClass}`}>{preview}</div>
    </div>
  );
}
