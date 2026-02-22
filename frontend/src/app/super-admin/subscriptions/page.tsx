'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Shield, Search, RefreshCw, ChevronDown, CheckCircle, Clock,
  XCircle, AlertTriangle, Users, Zap, CreditCard, StickyNote,
  BarChart3, Play, ToggleRight, ArrowLeft, RotateCcw, Banknote,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────
interface OrgSub {
  id: string;
  status: string;
  billingCycle: string;
  isPriceLockedForever: boolean;
  currentEmployeeCount: number;
  employeeCount: number;
  adminCount: number;
  customPricePerEmployee: number | null;
  customPriceExpiresAt: string | null;
  trialEndsAt: string | null;
  setupFeeWaived: boolean;
  setupFeeWaivedNote: string | null;
  organization: { id: string; name: string; email: string };
  plan: { tier: string; displayName: string; pricePerEmployee: number; maxEmployees: number };
  adminNotes: Array<{ note: string; createdAt: string; createdBy: string }>;
}

interface Pagination { page: number; limit: number; total: number; pages: number }

const STATUS_META: Record<string, { label: string; dot: string; badge: string; icon: typeof CheckCircle }> = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  TRIALING:  { label: 'Trial',     dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  EXPIRED:   { label: 'Expired',   dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200',             icon: XCircle },
  GRACE_PERIOD: { label: 'Grace Period', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  SUSPENDED: { label: 'Suspended', dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200',    icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200',      icon: XCircle },
};

const FEATURE_KEYS = [
  { key: 'featureLeave', label: 'Leave Management' },
  { key: 'featureFullPayroll', label: 'Basic Payroll' },
  { key: 'featureReports', label: 'Basic Reports' },
  { key: 'featurePayrollWorkflow', label: 'Payroll Workflow' },
  { key: 'featureFileDownload', label: 'File Downloads' },
  { key: 'featureTotp', label: 'TOTP Auth' },
  { key: 'featureNotifications', label: 'Notifications' },
  { key: 'featureOnboarding', label: 'Onboarding' },
  { key: 'featureManualCorrection', label: 'Manual Correction' },
  { key: 'featureAuditLog', label: 'Audit Log' },
  { key: 'featureDownloadReports', label: 'Download Reports' },
  { key: 'featureDownloadPayslips', label: 'Download Payslips' },
  { key: 'featureDownloadAuditLog', label: 'Download Audit Log' },
  { key: 'featureDownloadLeaveRecords', label: 'Download Leave Records' },
];

export default function SuperAdminSubscriptionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [subs, setSubs] = useState<OrgSub[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [tierInput, setTierInput] = useState<Record<string, string>>({});
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [priceExpiry, setPriceExpiry] = useState<Record<string, string>>({});
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [forceTrial, setForceTrial] = useState<Record<string, boolean>>({});
  const [billingCycleInput, setBillingCycleInput] = useState<Record<string, string>>({});
  const [overrideLoading, setOverrideLoading] = useState('');
  // Tracks which org's reset button is in "confirm" mode
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState<Record<string, string>>({});

  const toggleOverride = async (orgId: string, featureKey: string, currentVal: boolean | null, planVal: boolean) => {
    let nextVal: boolean | null;
    if (currentVal === null) nextVal = !planVal;
    else if (currentVal === !planVal) nextVal = planVal;
    else nextVal = null;
    const overrideKey = 'override' + featureKey.charAt(0).toUpperCase() + featureKey.slice(1);
    setOverrideLoading(orgId + featureKey);
    const res = await api.patch('/api/super-admin/subscriptions/' + orgId + '/feature-overrides', { [overrideKey]: nextVal });
    setOverrideLoading('');
    if (res.error) { flash(res.error.message, true); }
    else { flash('Override updated'); loadSubs(); }
  };

  // Resets custom price + all feature overrides in two sequential calls
  const resetToDefaults = async (sub: OrgSub) => {
    const orgId = sub.organization.id;
    setActionLoading(orgId + 'reset');

    // Build a payload that nulls every override key
    const allNullOverrides = FEATURE_KEYS.reduce((acc, f) => {
      const overrideKey = 'override' + f.key.charAt(0).toUpperCase() + f.key.slice(1);
      return { ...acc, [overrideKey]: null };
    }, {} as Record<string, null>);

    const [priceRes, overrideRes] = await Promise.all([
      api.patch(`/api/super-admin/subscriptions/${orgId}/override-pricing`, { customPricePerEmployee: null }),
      api.patch(`/api/super-admin/subscriptions/${orgId}/feature-overrides`, allNullOverrides),
    ]);

    setActionLoading('');
    setResetConfirmId(null);

    if (priceRes.error || overrideRes.error) {
      flash((priceRes.error ?? overrideRes.error)?.message ?? 'Reset failed', true);
    } else {
      flash('Reset to plan defaults');
      loadSubs();
    }
  };

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'SUPER_ADMIN')) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') loadSubs();
  }, [user, search, statusFilter]);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await api.get(`/api/super-admin/subscriptions?${params}`);
    if (res.data) {
      const d = res.data as { subscriptions: OrgSub[]; pagination: Pagination };
      setSubs(d.subscriptions);
      setPagination(d.pagination);
    }
    setLoading(false);
  }, [search, statusFilter]);

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const doAction = async (orgId: string, method: 'post' | 'patch', path: string, body: object, label: string) => {
    setActionLoading(orgId + path);
    const res = method === 'post'
      ? await api.post(`/api/super-admin/subscriptions/${orgId}/${path}`, body)
      : await api.patch(`/api/super-admin/subscriptions/${orgId}/${path}`, body);
    setActionLoading('');
    if (res.error) { flash(res.error.message, true); return false; }
    flash(label); loadSubs(); return true;
  };

  const runTrialJob = async () => {
    setActionLoading('trial-job');
    const res = await api.post('/api/super-admin/subscriptions/run-trial-job', {});
    setActionLoading('');
    if (res.error) flash(res.error.message, true);
    else flash('Trial expiry job completed');
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/super-admin')}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-200" />
              <Shield className="w-4 h-4 text-slate-900" />
              <span className="text-sm font-semibold text-slate-900">Subscriptions</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">Organization billing management</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={loadSubs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button onClick={runTrialJob} disabled={actionLoading === 'trial-job'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50">
                <Play className="w-3.5 h-3.5" />
                {actionLoading === 'trial-job' ? 'Running...' : 'Run Trial Job'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-rose-50 rounded-lg border border-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="text-xs font-medium text-rose-700">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats strip */}
        {pagination && (
          <div className="grid grid-cols-5 gap-0 mb-8 border border-slate-200 rounded-xl overflow-hidden">
            {[
              { label: 'Total Orgs', value: pagination.total, icon: Users },
              { label: 'Trialing', value: subs.filter(s => s.status === 'TRIALING').length, icon: Clock },
              { label: 'Active', value: subs.filter(s => s.status === 'ACTIVE').length, icon: CheckCircle },
              { label: 'Total Employees', value: subs.reduce((sum, s) => sum + s.employeeCount, 0), icon: Users },
              { label: 'Total Admins', value: subs.reduce((sum, s) => sum + s.adminCount, 0), icon: Shield },
            ].map((s, i) => (
              <div key={s.label} className={`px-5 py-4 bg-white ${i < 4 ? 'border-r border-slate-200' : ''}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <s.icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
                </div>
                <p className="text-xl font-semibold text-slate-900 tracking-tight">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">All Subscriptions</h2>
            {pagination && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {pagination.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 border border-slate-200 rounded-xl">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : subs.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-16 text-center">
            <p className="text-sm text-slate-500">No subscriptions found</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="col-span-4 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Organization</div>
              <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Plan</div>
              <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Users</div>
              <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pricing</div>
              <div className="col-span-1 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Status</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-slate-100">
              {subs.map(sub => {
                const meta = STATUS_META[sub.status] ?? STATUS_META['ACTIVE'];
                const isExpanded = expandedId === sub.organization.id;
                const effectivePrice = sub.customPricePerEmployee !== null
                  ? sub.customPricePerEmployee
                  : sub.plan.pricePerEmployee;
                const orgId = sub.organization.id;

                // Count how many feature overrides are active
                const activeOverrides = FEATURE_KEYS.filter(f => {
                  const overrideKey = ('override' + f.key.charAt(0).toUpperCase() + f.key.slice(1)) as keyof OrgSub;
                  const v = (sub as any)[overrideKey];
                  return v !== null && v !== undefined;
                }).length;

                const hasAnyOverride = sub.customPricePerEmployee !== null || activeOverrides > 0;
                const isResetConfirming = resetConfirmId === orgId;

                return (
                  <div key={sub.id}>
                    {/* Main row */}
                    <div
                      className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : orgId)}
                    >
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{sub.organization.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{sub.organization.email}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-900">{sub.plan.displayName}</p>
                        {sub.plan.tier !== 'STARTER' && <p className="text-xs text-slate-400">{sub.billingCycle}</p>}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-slate-900">{sub.employeeCount + sub.adminCount}</p>
                        <p className="text-xs text-slate-400">{sub.adminCount} admin · {sub.employeeCount} emp</p>
                      </div>
                      <div className="col-span-2">
                        {effectivePrice === 0 ? (
                          <p className="text-xs font-medium text-slate-900">Free</p>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-slate-900">Rs. {effectivePrice}/emp</p>
                            {sub.customPricePerEmployee !== null && (
                              <p className="text-[10px] text-violet-600 font-medium">Custom price</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 space-y-5">

                        {/* ── Reset to defaults bar ── */}
                        {hasAnyOverride && (
                          <div className={`rounded-lg border transition-colors ${
                            isResetConfirming
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-slate-200 bg-white'
                          }`}>
                            {!isResetConfirming ? (
                              /* Idle state — subtle strip */
                              <div className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>
                                    This org has
                                    {sub.customPricePerEmployee !== null && activeOverrides > 0
                                      ? ` a custom price and ${activeOverrides} feature override${activeOverrides > 1 ? 's' : ''}`
                                      : sub.customPricePerEmployee !== null
                                      ? ' a custom price override'
                                      : ` ${activeOverrides} feature override${activeOverrides > 1 ? 's' : ''}`
                                    } active.
                                  </span>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); setResetConfirmId(orgId); }}
                                  className="text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-md border border-slate-200 hover:border-rose-200 transition-colors"
                                >
                                  Reset to plan defaults
                                </button>
                              </div>
                            ) : (
                              /* Confirm state — shows exactly what will be wiped */
                              <div className="px-4 py-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <p className="text-xs font-semibold text-amber-900">
                                    Reset all overrides for <span className="font-bold">{sub.organization.name}</span>?
                                  </p>
                                </div>

                                {/* What will be cleared */}
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Custom pricing</p>
                                    {sub.customPricePerEmployee !== null ? (
                                      <p className="text-slate-700">
                                        Rs. {sub.customPricePerEmployee}/emp
                                        <span className="text-slate-400 ml-1">→</span>
                                        <span className="text-slate-700 ml-1">Rs. {sub.plan.pricePerEmployee}/emp ({sub.plan.displayName} default)</span>
                                      </p>
                                    ) : (
                                      <p className="text-slate-400">No custom price set</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Feature overrides</p>
                                    {activeOverrides > 0 ? (
                                      <p className="text-slate-700">
                                        {activeOverrides} override{activeOverrides > 1 ? 's' : ''} will revert to {sub.plan.displayName} plan defaults
                                      </p>
                                    ) : (
                                      <p className="text-slate-400">No feature overrides set</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                                  <button
                                    disabled={actionLoading === orgId + 'reset'}
                                    onClick={e => { e.stopPropagation(); resetToDefaults(sub); }}
                                    className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 transition-colors"
                                  >
                                    {actionLoading === orgId + 'reset' ? 'Resetting...' : 'Confirm reset'}
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setResetConfirmId(null); }}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md border border-amber-200 hover:border-slate-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top row — Assign Tier + Override Pricing + Waive Setup Fee + Status Control */}
                        <div className="grid grid-cols-4 gap-4">

                          {/* Assign Tier */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Zap className="w-3 h-3" /> Assign Tier
                            </p>
                            <div className="space-y-2">
                              <select
                                value={tierInput[orgId] ?? sub.plan.tier}
                                onChange={e => setTierInput(p => ({ ...p, [orgId]: e.target.value }))}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                              >
                                <option value="STARTER">Starter (Free)</option>
                                <option value="OPERATIONS">Operations</option>
                              </select>
                              {(tierInput[orgId] ?? sub.plan.tier) === 'OPERATIONS' && (
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={forceTrial[orgId] ?? false}
                                    onChange={e => setForceTrial(p => ({ ...p, [orgId]: e.target.checked }))}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                                  />
                                  <span className="text-[11px] text-slate-500">Start with trial</span>
                                </label>
                              )}
                              {(tierInput[orgId] ?? sub.plan.tier) === 'OPERATIONS' && (
                                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-medium">
                                  <button onClick={() => setBillingCycleInput(p => ({ ...p, [orgId]: 'MONTHLY' }))} className={`flex-1 py-1.5 transition-colors ${(billingCycleInput[orgId] ?? sub.billingCycle ?? 'MONTHLY') === 'MONTHLY' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Monthly</button>
                                  <button onClick={() => setBillingCycleInput(p => ({ ...p, [orgId]: 'ANNUAL' }))} className={`flex-1 py-1.5 transition-colors ${(billingCycleInput[orgId] ?? sub.billingCycle ?? 'MONTHLY') === 'ANNUAL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Annual</button>
                                </div>
                              )}
                              <button
                                disabled={!!actionLoading}
                                onClick={() => doAction(orgId, 'post', 'assign-tier', {
                                  tier: tierInput[orgId] ?? sub.plan.tier,
                                  billingCycle: billingCycleInput[orgId] ?? sub.billingCycle ?? 'MONTHLY',
                                  ...(forceTrial[orgId] ? { forceTrial: true } : {}),
                                }, 'Tier assigned')}
                                className="w-full text-xs font-medium py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === orgId + 'assign-tier' ? 'Saving...' : 'Save Tier'}
                              </button>
                            </div>
                          </div>

                          {/* Override Pricing */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" /> Override Pricing
                              {sub.isPriceLockedForever && (
                                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full">LOCKED</span>
                              )}
                            </p>
                            {/* Active agreement info */}
                            {sub.customPricePerEmployee !== null && sub.customPriceExpiresAt && (
                              <div className="mb-2 px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-[11px] font-medium text-amber-800">
                                  Rs. {sub.customPricePerEmployee}/emp until{' '}
                                  {new Date(sub.customPriceExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-amber-600 mt-0.5">
                                  Reverts to Rs. {sub.plan.pricePerEmployee}/emp on expiry
                                </p>
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rs.</span>
                                <input
                                  type="number"
                                  placeholder={String(effectivePrice)}
                                  value={priceInput[orgId] ?? ''}
                                  onChange={e => setPriceInput(p => ({ ...p, [orgId]: e.target.value }))}
                                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 mb-1">Expiry date (optional)</p>
                                <input
                                  type="date"
                                  value={priceExpiry[orgId] ?? ''}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={e => setPriceExpiry(p => ({ ...p, [orgId]: e.target.value }))}
                                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                              </div>
                              <button
                                disabled={!!actionLoading}
                                onClick={() => doAction(orgId, 'patch', 'override-pricing', {
                                  customPricePerEmployee: priceInput[orgId] ? Number(priceInput[orgId]) : null,
                                  customPriceExpiresAt: priceExpiry[orgId]
                                    ? new Date(priceExpiry[orgId]).toISOString()
                                    : null,
                                }, 'Pricing updated')}
                                className="w-full text-xs font-medium py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === orgId + 'override-pricing' ? 'Saving...' : 'Set Price'}
                              </button>
                            </div>
                          </div>

                          {/* Waive Setup Fee */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Banknote className="w-3 h-3" /> Waive Setup Fee
                              {sub.setupFeeWaived && (
                                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">WAIVED</span>
                              )}
                            </p>
                            {sub.setupFeeWaived ? (
                              <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                                <p className="text-[11px] font-medium text-emerald-700">Setup fee has been waived</p>
                                {sub.setupFeeWaivedNote && (
                                  <p className="text-[11px] text-emerald-600 italic">"{sub.setupFeeWaivedNote}"</p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Reason for waiving..."
                                  value={waiveReason[orgId] ?? ''}
                                  onChange={e => setWaiveReason(p => ({ ...p, [orgId]: e.target.value }))}
                                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  disabled={!!actionLoading || !waiveReason[orgId]?.trim()}
                                  onClick={() => doAction(orgId, 'patch', 'waive-setup-fee', { reason: waiveReason[orgId] }, 'Setup fee waived')}
                                  className="w-full text-xs font-medium py-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === orgId + 'waive-setup-fee' ? 'Waiving...' : 'Waive Setup Fee'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status Control */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" /> Status Control
                            </p>
                            {sub.status !== 'SUSPENDED' ? (
                              <div className="space-y-2">
                                {(sub.status === 'TRIALING' || sub.status === 'GRACE_PERIOD') && (
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="365"
                                      placeholder="Days to extend..."
                                      value={extendDays[orgId] ?? ''}
                                      onChange={e => setExtendDays(p => ({ ...p, [orgId]: e.target.value }))}
                                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <button
                                      disabled={!!actionLoading || !extendDays[orgId]?.trim()}
                                      onClick={() => doAction(orgId, 'patch', 'extend-trial', { days: parseInt(extendDays[orgId]) }, 'Trial extended').then(() => setExtendDays(p => ({ ...p, [orgId]: '' })))}
                                      className="px-3 py-2 text-xs font-medium border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                      {actionLoading === orgId + 'extend-trial' ? '...' : 'Extend Trial'}
                                    </button>
                                  </div>
                                )}
                                <input
                                  type="text"
                                  placeholder="Reason for suspension..."
                                  value={suspendReason[orgId] ?? ''}
                                  onChange={e => setSuspendReason(p => ({ ...p, [orgId]: e.target.value }))}
                                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  disabled={!!actionLoading || !suspendReason[orgId]?.trim()}
                                  onClick={() => doAction(orgId, 'patch', 'suspend', { reason: suspendReason[orgId] }, 'Subscription suspended')}
                                  className="w-full text-xs font-medium py-2 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === orgId + 'suspend' ? 'Suspending...' : 'Suspend Subscription'}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <button
                                  disabled={!!actionLoading}
                                  onClick={() => doAction(orgId, 'patch', 'reactivate', {}, 'Subscription reactivated')}
                                  className="w-full text-xs font-medium py-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === orgId + 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                                </button>
                                <button
                                  disabled={!!actionLoading}
                                  onClick={() => doAction(orgId, 'patch', 'mark-expired', {
                                    reason: suspendReason[orgId]?.trim() || 'Manually expired by super admin',
                                  }, 'Marked as expired')}
                                  className="w-full text-xs font-medium py-2 border border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === orgId + 'mark-expired' ? 'Expiring...' : 'Mark as Expired'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Feature Overrides */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <ToggleRight className="w-3 h-3" /> Feature Overrides
                            <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case tracking-normal">Click to cycle: Plan Default → Force On → Force Off</span>
                          </p>
                          <div className="grid grid-cols-7 gap-1.5">
                            {FEATURE_KEYS.map(f => {
                              const overrideKey = ('override' + f.key.charAt(0).toUpperCase() + f.key.slice(1)) as keyof OrgSub;
                              const overrideVal = (sub as any)[overrideKey] as boolean | null;
                              const planVal = (sub.plan as any)[f.key] as boolean | undefined;
                              const effectiveVal = overrideVal !== null && overrideVal !== undefined ? overrideVal : !!planVal;
                              const isOverridden = overrideVal !== null && overrideVal !== undefined;
                              return (
                                <button
                                  key={f.key}
                                  onClick={() => toggleOverride(orgId, f.key, overrideVal ?? null, !!planVal)}
                                  disabled={overrideLoading === orgId + f.key}
                                  className={`flex flex-col items-start gap-1 px-2.5 py-2 rounded-lg text-[11px] border transition-colors ${
                                    isOverridden
                                      ? effectiveVal
                                        ? 'border-emerald-200 bg-emerald-50'
                                        : 'border-rose-200 bg-rose-50'
                                      : 'border-slate-200 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 w-full">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${effectiveVal ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    {isOverridden && (
                                      <span className={`ml-auto text-[9px] font-bold ${effectiveVal ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {effectiveVal ? 'ON' : 'OFF'}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`leading-tight ${isOverridden ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                                    {f.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Admin Notes + Billing log */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <StickyNote className="w-3 h-3" /> Admin Notes
                            </p>
                            <div className="flex gap-2 mb-3">
                              <input
                                type="text"
                                placeholder="Add a note..."
                                value={noteInput[orgId] ?? ''}
                                onChange={e => setNoteInput(p => ({ ...p, [orgId]: e.target.value }))}
                                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                disabled={!!actionLoading || !noteInput[orgId]?.trim()}
                                onClick={async () => {
                                  const ok = await doAction(orgId, 'post', 'notes', { note: noteInput[orgId] }, 'Note added');
                                  if (ok) setNoteInput(p => ({ ...p, [orgId]: '' }));
                                }}
                                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === orgId + 'notes' ? '...' : 'Add'}
                              </button>
                            </div>
                            {sub.adminNotes.length > 0 && (
                              <div className="space-y-1.5">
                                {sub.adminNotes.slice(0, 3).map((n, i) => (
                                  <div key={i} className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
                                    <p className="text-xs text-slate-600">{n.note}</p>
                                    <span className="text-[10px] text-slate-400 ml-3 shrink-0">{new Date(n.createdAt).toLocaleDateString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <BarChart3 className="w-3 h-3" /> Billing Log
                            </p>
                            <button
                              onClick={() => router.push(`/super-admin/subscriptions/${orgId}/billing-log`)}
                              className="flex items-center justify-between px-4 py-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors group"
                            >
                              View full billing history
                              <BarChart3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
