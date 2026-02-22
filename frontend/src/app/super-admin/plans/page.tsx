'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Shield, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

interface Plan {
  id: string;
  tier: string;
  displayName: string;
  pricePerEmployee: number;
  defaultSetupFee: number | null;
  trialDaysMonthly: number;
  gracePeriodDays: number;
  [key: string]: any;
}

const FEATURE_GROUPS = [
  {
    label: 'Core HR',
    features: [
      { key: 'featureLeave', label: 'Leave Management' },
      { key: 'featureFullPayroll', label: 'Basic Payroll (Settings, Generate, Records)' },
      { key: 'featureReports', label: 'Basic Reports (Daily)' },
    ],
  },
  {
    label: 'Advanced Payroll',
    features: [
      { key: 'featurePayrollWorkflow', label: 'Payroll Workflow (Approve/Pay, Multi-Month, Annual)' },
    ],
  },
  {
    label: 'Security & Tools',
    features: [
      { key: 'featureTotp', label: 'TOTP Two-Factor Authentication' },
      { key: 'featureManualCorrection', label: 'Manual Attendance Correction' },
      { key: 'featureNotifications', label: 'Email Notifications' },
      { key: 'featureOnboarding', label: 'Employee Onboarding' },
      { key: 'featureAuditLog', label: 'Audit Log' },
    ],
  },
  {
    label: 'Downloads',
    features: [
      { key: 'featureFileDownload', label: 'File Downloads (Master Toggle)' },
      { key: 'featureDownloadReports', label: 'Download Reports CSV' },
      { key: 'featureDownloadPayslips', label: 'Download Payslip PDF' },
      { key: 'featureDownloadAuditLog', label: 'Download Audit Log' },
      { key: 'featureDownloadLeaveRecords', label: 'Download Leave Records' },
    ],
  },
];

const TIERS = ['STARTER', 'OPERATIONS'] as const;

export default function PlansPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({});
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [priceSaving, setPriceSaving] = useState('');
  const [setupFeeInput, setSetupFeeInput] = useState<Record<string, string>>({});
  const [setupFeeSaving, setSetupFeeSaving] = useState('');
  const [trialInput, setTrialInput] = useState<Record<string, string>>({});
  const [trialSaving, setTrialSaving] = useState('');
  const [graceInput, setGraceInput] = useState<Record<string, string>>({});
  const [graceSaving, setGraceSaving] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [discountSaving, setDiscountSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'SUPER_ADMIN')) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') loadPlans();
  }, [user]);

  const loadPlans = async () => {
    setLoading(true);
    const res = await api.get('/api/super-admin/plans');
    if (res.data) setPlans(res.data as Plan[]);
    setLoading(false);
  };

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const showError   = (msg: string) => { setError(msg);   setTimeout(() => setError(''),   4000); };

  const getVal = (tier: string, key: string): boolean => {
    if (changes[tier] && typeof changes[tier][key] === 'boolean') return changes[tier][key];
    const plan = plans.find(p => p.tier === tier);
    return plan ? !!plan[key] : false;
  };

  const toggle = (tier: string, key: string) => {
    const current = getVal(tier, key);
    setChanges(prev => ({ ...prev, [tier]: { ...(prev[tier] || {}), [key]: !current } }));
  };

  const hasChanges = (tier: string) => changes[tier] && Object.keys(changes[tier]).length > 0;

  const saveTier = async (tier: string) => {
    if (!changes[tier]) return;
    setSaving(tier);
    const res = await api.patch('/api/super-admin/plans/' + tier + '/features', changes[tier]);
    setSaving('');
    if (res.error) { showError(res.error.message); return; }
    showSuccess(tier + ' features updated');
    setChanges(prev => { const n = { ...prev }; delete n[tier]; return n; });
    loadPlans();
  };

  const savePrice = async (tier: string) => {
    const val = Number(priceInput[tier]);
    if (!priceInput[tier] || isNaN(val) || val < 0) return;
    setPriceSaving(tier);
    const res = await api.patch('/api/super-admin/plans/' + tier + '/price', { pricePerEmployee: val });
    setPriceSaving('');
    if (res.error) { showError(res.error.message); return; }
    showSuccess(tier + ' price updated to Rs. ' + val);
    setPriceInput(prev => { const n = { ...prev }; delete n[tier]; return n; });
    loadPlans();
  };

  const saveSetupFee = async (tier: string) => {
    const raw = setupFeeInput[tier];
    const val = raw === '' ? null : Number(raw);
    if (val !== null && (isNaN(val) || val < 0)) return;
    setSetupFeeSaving(tier);
    const res = await api.patch('/api/super-admin/plans/' + tier + '/setup-fee', { defaultSetupFee: val });
    setSetupFeeSaving('');
    if (res.error) { showError(res.error.message); return; }
    showSuccess(tier + ' setup fee ' + (val === null ? 'cleared' : 'updated to Rs. ' + val));
    setSetupFeeInput(prev => { const n = { ...prev }; delete n[tier]; return n; });
    loadPlans();
  };

  const saveTrialDays = async (tier: string) => {
    const val = parseInt(trialInput[tier]);
    if (!trialInput[tier] || isNaN(val) || val < 0) return;
    setTrialSaving(tier);
    const res = await api.patch('/api/super-admin/plans/' + tier + '/trial-days', { days: val });
    setTrialSaving('');
    if (res.error) { showError(res.error.message); return; }
    showSuccess(tier + ' trial period updated to ' + val + ' days');
    setTrialInput(prev => { const n = { ...prev }; delete n[tier]; return n; });
    loadPlans();
  };

  const saveGracePeriod = async (tier: string) => {
    const val = parseInt(graceInput[tier]);
    if (!graceInput[tier] || isNaN(val) || val < 1) return;
    setGraceSaving(tier);
    const res = await api.patch('/api/super-admin/plans/' + tier + '/grace-period', { gracePeriodDays: val });
    setGraceSaving('');
    if (res.error) { showError(res.error.message); return; }
    showSuccess(tier + ' grace period updated to ' + val + ' days');
    setGraceInput(prev => { const n = { ...prev }; delete n[tier]; return n; });
    loadPlans();
  };

  const saveAnnualDiscount = async () => {
    const val = parseInt(discountInput);
    if (discountInput === '' || isNaN(val) || val < 0 || val > 100) return;
    setDiscountSaving(true);
    const res = await api.patch('/api/super-admin/plans/OPERATIONS/annual-discount', { annualDiscountPercent: val });
    setDiscountSaving(false);
    if (res.error) { showError(res.error.message); return; }
    showSuccess('Annual discount updated to ' + val + '%');
    setDiscountInput('');
    loadPlans();
  };
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const opsPlan = plans.find(p => p.tier === 'OPERATIONS');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">Plan Configuration</h1>
          <p className="text-xs text-slate-500">Feature flags, pricing, trial periods, and grace periods</p>
        </div>
        <button onClick={() => router.push('/super-admin')} className="text-xs text-slate-500 hover:text-slate-700">
          &larr; Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4 shrink-0" />{success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Feature flags table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_140px] px-5 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Feature</span>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-900">Starter</span>
              <p className="text-[10px] text-slate-400">Free</p>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-900">Operations</span>
              <p className="text-[10px] text-slate-400">Rs. {opsPlan?.pricePerEmployee ?? 250}/emp</p>
            </div>
          </div>
          {FEATURE_GROUPS.map((group, gi) => (
            <div key={gi}>
              <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</span>
              </div>
              {group.features.map((f) => {
                const starterVal     = getVal('STARTER', f.key);
                const opsVal         = getVal('OPERATIONS', f.key);
                const starterChanged = changes['STARTER']    && typeof changes['STARTER'][f.key]    === 'boolean';
                const opsChanged     = changes['OPERATIONS'] && typeof changes['OPERATIONS'][f.key] === 'boolean';
                return (
                  <div key={f.key} className="grid grid-cols-[1fr_140px_140px] px-5 py-3 border-b border-slate-100 items-center hover:bg-slate-50/50">
                    <span className="text-sm text-slate-700">{f.label}</span>
                    <div className="flex justify-center">
                      <button onClick={() => toggle('STARTER', f.key)}>
                        {starterVal
                          ? <ToggleRight className={'w-8 h-8 text-emerald-500 ' + (starterChanged ? 'ring-2 ring-amber-300 rounded' : '')} />
                          : <ToggleLeft  className={'w-8 h-8 text-slate-300 '  + (starterChanged ? 'ring-2 ring-amber-300 rounded' : '')} />}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => toggle('OPERATIONS', f.key)}>
                        {opsVal
                          ? <ToggleRight className={'w-8 h-8 text-emerald-500 ' + (opsChanged ? 'ring-2 ring-amber-300 rounded' : '')} />
                          : <ToggleLeft  className={'w-8 h-8 text-slate-300 '  + (opsChanged ? 'ring-2 ring-amber-300 rounded' : '')} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Price per employee */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Default Price Per Employee</p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map(tier => {
              const plan = plans.find(p => p.tier === tier);
              return (
                <div key={tier}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'} (Rs.)
                  </label>
                  <div className="flex gap-2">
                    <input type="number" min="0"
                      placeholder={String(plan?.pricePerEmployee ?? 0)}
                      value={priceInput[tier] ?? ''}
                      onChange={e => setPriceInput(p => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button onClick={() => savePrice(tier)}
                      disabled={!priceInput[tier] || priceSaving === tier}
                      className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40">
                      {priceSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Applies to all orgs on this plan. Individual overrides are set from the Subscriptions page.</p>
        </div>

        {/* Default setup fee */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Default Setup Fee</p>
          <p className="text-[11px] text-slate-400 mb-4">One-time fee on plan activation. Clear to remove. Individual orgs can have this waived from the Subscriptions page.</p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map(tier => {
              const plan = plans.find(p => p.tier === tier);
              return (
                <div key={tier}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'} (Rs.)
                    {plan?.defaultSetupFee != null
                      ? <span className="ml-2 text-slate-400 font-normal">Current: Rs. {plan.defaultSetupFee}</span>
                      : <span className="ml-2 text-slate-400 font-normal">Current: none</span>}
                  </label>
                  <div className="flex gap-2">
                    <input type="number" min="0"
                      placeholder={plan?.defaultSetupFee != null ? String(plan.defaultSetupFee) : 'No setup fee'}
                      value={setupFeeInput[tier] ?? ''}
                      onChange={e => setSetupFeeInput(p => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button onClick={() => saveSetupFee(tier)}
                      disabled={setupFeeInput[tier] === undefined || setupFeeSaving === tier}
                      className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40">
                      {setupFeeSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trial period */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trial Period (Days)</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Days a new org can trial before billing starts. Set to 0 to disable.
            Trial is one-time per organization — orgs that have used their trial go straight to Active on reassignment.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map(tier => {
              const plan = plans.find(p => p.tier === tier);
              return (
                <div key={tier}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'}
                    <span className="ml-2 text-slate-400 font-normal">Current: {plan?.trialDaysMonthly ?? 30} days</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="number" min="0" step="1"
                      placeholder={String(plan?.trialDaysMonthly ?? 30)}
                      value={trialInput[tier] ?? ''}
                      onChange={e => setTrialInput(p => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button onClick={() => saveTrialDays(tier)}
                      disabled={!trialInput[tier] || trialSaving === tier}
                      className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40">
                      {trialSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grace period */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Grace Period (Days)</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Days after trial ends before consequences apply. Orgs with ≤5 employees are quietly downgraded to Starter.
            Orgs with more are Suspended until they pay. Minimum: 1 day.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map(tier => {
              const plan = plans.find(p => p.tier === tier);
              return (
                <div key={tier}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'}
                    <span className="ml-2 text-slate-400 font-normal">Current: {plan?.gracePeriodDays ?? 7} days</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="number" min="1" step="1"
                      placeholder={String(plan?.gracePeriodDays ?? 7)}
                      value={graceInput[tier] ?? ''}
                      onChange={e => setGraceInput(p => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button onClick={() => saveGracePeriod(tier)}
                      disabled={!graceInput[tier] || graceSaving === tier}
                      className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40">
                      {graceSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Annual discount */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Annual Billing Discount</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Percentage discount applied when an org is assigned the Annual billing cycle. Only applies to Operations. 0 = no discount.
          </p>
          <div className="flex gap-2 max-w-xs">
            <input type="number" min="0" max="100" step="1"
              placeholder={String(opsPlan?.annualDiscountPercent ?? 0) + '% (current)'}
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button onClick={saveAnnualDiscount}
              disabled={discountInput === '' || discountSaving}
              className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40">
              {discountSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Feature flag save buttons */}
        <div className="flex items-center gap-3 justify-end">
          {hasChanges('STARTER') && (
            <button onClick={() => saveTier('STARTER')} disabled={saving === 'STARTER'}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving === 'STARTER' ? 'Saving...' : 'Save Starter Features'}
            </button>
          )}
          {hasChanges('OPERATIONS') && (
            <button onClick={() => saveTier('OPERATIONS')} disabled={saving === 'OPERATIONS'}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving === 'OPERATIONS' ? 'Saving...' : 'Save Operations Features'}
            </button>
          )}
          {!hasChanges('STARTER') && !hasChanges('OPERATIONS') && (
            <span className="text-xs text-slate-400">No unsaved feature changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
