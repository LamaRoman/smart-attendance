'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Shield, Save, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'

interface Plan {
  id: string
  tier: string
  displayName: string
  pricePerEmployee: number
  defaultSetupFee: number | null
  trialDaysMonthly: number
  gracePeriodDays: number
  [key: string]: any
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
      {
        key: 'featurePayrollWorkflow',
        label: 'Payroll Workflow (Approve/Pay, Multi-Month, Annual)',
      },
    ],
  },
  {
    label: 'Security & Tools',
    features: [
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
]

const TIERS = ['STARTER', 'OPERATIONS'] as const

export default function PlansPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({})
  const [priceInput, setPriceInput] = useState<Record<string, string>>({})
  const [priceSaving, setPriceSaving] = useState('')
  const [setupFeeInput, setSetupFeeInput] = useState<Record<string, string>>({})
  const [setupFeeSaving, setSetupFeeSaving] = useState('')
  const [trialInput, setTrialInput] = useState<Record<string, string>>({})
  const [trialSaving, setTrialSaving] = useState('')
  const [graceInput, setGraceInput] = useState<Record<string, string>>({})
  const [graceSaving, setGraceSaving] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountSaving, setDiscountSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'SUPER_ADMIN')) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') loadPlans()
  }, [user])

  const loadPlans = async () => {
    setLoading(true)
    const res = await api.get('/api/v1/super-admin/plans')
    if (res.data) setPlans(res.data as Plan[])
    setLoading(false)
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }
  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 4000)
  }

  const getVal = (tier: string, key: string): boolean => {
    if (changes[tier] && typeof changes[tier][key] === 'boolean') return changes[tier][key]
    const plan = plans.find((p) => p.tier === tier)
    return plan ? !!plan[key] : false
  }

  const toggle = (tier: string, key: string) => {
    const current = getVal(tier, key)
    setChanges((prev) => ({ ...prev, [tier]: { ...(prev[tier] || {}), [key]: !current } }))
  }

  const hasChanges = (tier: string) => changes[tier] && Object.keys(changes[tier]).length > 0

  const saveTier = async (tier: string) => {
    if (!changes[tier]) return
    setSaving(tier)
    const res = await api.patch('/api/v1/super-admin/plans/' + tier + '/features', changes[tier])
    setSaving('')
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess(tier + ' features updated')
    setChanges((prev) => {
      const n = { ...prev }
      delete n[tier]
      return n
    })
    loadPlans()
  }

  const savePrice = async (tier: string) => {
    const val = Number(priceInput[tier])
    if (!priceInput[tier] || isNaN(val) || val < 0) return
    setPriceSaving(tier)
    const res = await api.patch('/api/v1/super-admin/plans/' + tier + '/price', {
      pricePerEmployee: val,
    })
    setPriceSaving('')
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess(tier + ' price updated to Rs. ' + val)
    setPriceInput((prev) => {
      const n = { ...prev }
      delete n[tier]
      return n
    })
    loadPlans()
  }

  const saveSetupFee = async (tier: string) => {
    const raw = setupFeeInput[tier]
    const val = raw === '' ? null : Number(raw)
    if (val !== null && (isNaN(val) || val < 0)) return
    setSetupFeeSaving(tier)
    const res = await api.patch('/api/v1/super-admin/plans/' + tier + '/setup-fee', {
      defaultSetupFee: val,
    })
    setSetupFeeSaving('')
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess(tier + ' setup fee ' + (val === null ? 'cleared' : 'updated to Rs. ' + val))
    setSetupFeeInput((prev) => {
      const n = { ...prev }
      delete n[tier]
      return n
    })
    loadPlans()
  }

  const saveTrialDays = async (tier: string) => {
    const val = parseInt(trialInput[tier])
    if (!trialInput[tier] || isNaN(val) || val < 0) return
    setTrialSaving(tier)
    const res = await api.patch('/api/v1/super-admin/plans/' + tier + '/trial-days', { days: val })
    setTrialSaving('')
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess(tier + ' trial period updated to ' + val + ' days')
    setTrialInput((prev) => {
      const n = { ...prev }
      delete n[tier]
      return n
    })
    loadPlans()
  }

  const saveGracePeriod = async (tier: string) => {
    const val = parseInt(graceInput[tier])
    if (!graceInput[tier] || isNaN(val) || val < 1) return
    setGraceSaving(tier)
    const res = await api.patch('/api/v1/super-admin/plans/' + tier + '/grace-period', {
      gracePeriodDays: val,
    })
    setGraceSaving('')
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess(tier + ' grace period updated to ' + val + ' days')
    setGraceInput((prev) => {
      const n = { ...prev }
      delete n[tier]
      return n
    })
    loadPlans()
  }

  const saveAnnualDiscount = async () => {
    const val = parseInt(discountInput)
    if (discountInput === '' || isNaN(val) || val < 0 || val > 100) return
    setDiscountSaving(true)
    const res = await api.patch('/api/v1/super-admin/plans/OPERATIONS/annual-discount', {
      annualDiscountPercent: val,
    })
    setDiscountSaving(false)
    if (res.error) {
      showError(res.error.message)
      return
    }
    showSuccess('Annual discount updated to ' + val + '%')
    setDiscountInput('')
    loadPlans()
  }
  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  const opsPlan = plans.find((p) => p.tier === 'OPERATIONS')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">Plan Configuration</h1>
          <p className="text-xs text-slate-500">
            Feature flags, pricing, trial periods, and grace periods
          </p>
        </div>
        <button
          onClick={() => router.push('/super-admin')}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          &larr; Back
        </button>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Feature flags table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_140px_140px] border-b border-slate-200 bg-slate-50 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Feature
            </span>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-900">Starter</span>
              <p className="text-[10px] text-slate-400">Free</p>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-900">Operations</span>
              <p className="text-[10px] text-slate-400">
                Rs. {opsPlan?.pricePerEmployee ?? 250}/emp
              </p>
            </div>
          </div>
          {FEATURE_GROUPS.map((group, gi) => (
            <div key={gi}>
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </span>
              </div>
              {group.features.map((f) => {
                const starterVal = getVal('STARTER', f.key)
                const opsVal = getVal('OPERATIONS', f.key)
                const starterChanged =
                  changes['STARTER'] && typeof changes['STARTER'][f.key] === 'boolean'
                const opsChanged =
                  changes['OPERATIONS'] && typeof changes['OPERATIONS'][f.key] === 'boolean'
                return (
                  <div
                    key={f.key}
                    className="grid grid-cols-[1fr_140px_140px] items-center border-b border-slate-100 px-5 py-3 hover:bg-slate-50/50"
                  >
                    <span className="text-sm text-slate-700">{f.label}</span>
                    <div className="flex justify-center">
                      <button onClick={() => toggle('STARTER', f.key)}>
                        {starterVal ? (
                          <ToggleRight
                            className={
                              'h-8 w-8 text-emerald-500 ' +
                              (starterChanged ? 'rounded ring-2 ring-amber-300' : '')
                            }
                          />
                        ) : (
                          <ToggleLeft
                            className={
                              'h-8 w-8 text-slate-300 ' +
                              (starterChanged ? 'rounded ring-2 ring-amber-300' : '')
                            }
                          />
                        )}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => toggle('OPERATIONS', f.key)}>
                        {opsVal ? (
                          <ToggleRight
                            className={
                              'h-8 w-8 text-emerald-500 ' +
                              (opsChanged ? 'rounded ring-2 ring-amber-300' : '')
                            }
                          />
                        ) : (
                          <ToggleLeft
                            className={
                              'h-8 w-8 text-slate-300 ' +
                              (opsChanged ? 'rounded ring-2 ring-amber-300' : '')
                            }
                          />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Price per employee */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Default Price Per Employee
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map((tier) => {
              const plan = plans.find((p) => p.tier === tier)
              return (
                <div key={tier}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'} (Rs.)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={String(plan?.pricePerEmployee ?? 0)}
                      value={priceInput[tier] ?? ''}
                      onChange={(e) => setPriceInput((p) => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      onClick={() => savePrice(tier)}
                      disabled={!priceInput[tier] || priceSaving === tier}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {priceSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Applies to all orgs on this plan. Individual overrides are set from the Subscriptions
            page.
          </p>
        </div>

        {/* Default setup fee */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Default Setup Fee
          </p>
          <p className="mb-4 text-[11px] text-slate-400">
            One-time fee on plan activation. Clear to remove. Individual orgs can have this waived
            from the Subscriptions page.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map((tier) => {
              const plan = plans.find((p) => p.tier === tier)
              return (
                <div key={tier}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'} (Rs.)
                    {plan?.defaultSetupFee != null ? (
                      <span className="ml-2 font-normal text-slate-400">
                        Current: Rs. {plan.defaultSetupFee}
                      </span>
                    ) : (
                      <span className="ml-2 font-normal text-slate-400">Current: none</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={
                        plan?.defaultSetupFee != null
                          ? String(plan.defaultSetupFee)
                          : 'No setup fee'
                      }
                      value={setupFeeInput[tier] ?? ''}
                      onChange={(e) => setSetupFeeInput((p) => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      onClick={() => saveSetupFee(tier)}
                      disabled={setupFeeInput[tier] === undefined || setupFeeSaving === tier}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {setupFeeSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trial period */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Trial Period (Days)
          </p>
          <p className="mb-4 text-[11px] text-slate-400">
            Days a new org can trial before billing starts. Set to 0 to disable. Trial is one-time
            per organization — orgs that have used their trial go straight to Active on
            reassignment.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map((tier) => {
              const plan = plans.find((p) => p.tier === tier)
              return (
                <div key={tier}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'}
                    <span className="ml-2 font-normal text-slate-400">
                      Current: {plan?.trialDaysMonthly ?? 30} days
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder={String(plan?.trialDaysMonthly ?? 30)}
                      value={trialInput[tier] ?? ''}
                      onChange={(e) => setTrialInput((p) => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      onClick={() => saveTrialDays(tier)}
                      disabled={!trialInput[tier] || trialSaving === tier}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {trialSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Grace period */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Grace Period (Days)
          </p>
          <p className="mb-4 text-[11px] text-slate-400">
            Days after trial ends before consequences apply. Orgs with ≤5 employees are quietly
            downgraded to Starter. Orgs with more are Suspended until they pay. Minimum: 1 day.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {TIERS.map((tier) => {
              const plan = plans.find((p) => p.tier === tier)
              return (
                <div key={tier}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {tier === 'STARTER' ? 'Starter' : 'Operations'}
                    <span className="ml-2 font-normal text-slate-400">
                      Current: {plan?.gracePeriodDays ?? 7} days
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder={String(plan?.gracePeriodDays ?? 7)}
                      value={graceInput[tier] ?? ''}
                      onChange={(e) => setGraceInput((p) => ({ ...p, [tier]: e.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      onClick={() => saveGracePeriod(tier)}
                      disabled={!graceInput[tier] || graceSaving === tier}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {graceSaving === tier ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Annual discount */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Annual Billing Discount
          </p>
          <p className="mb-4 text-[11px] text-slate-400">
            Percentage discount applied when an org is assigned the Annual billing cycle. Only
            applies to Operations. 0 = no discount.
          </p>
          <div className="flex max-w-xs gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder={String(opsPlan?.annualDiscountPercent ?? 0) + '% (current)'}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button
              onClick={saveAnnualDiscount}
              disabled={discountInput === '' || discountSaving}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {discountSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Feature flag save buttons */}
        <div className="flex items-center justify-end gap-3">
          {hasChanges('STARTER') && (
            <button
              onClick={() => saveTier('STARTER')}
              disabled={saving === 'STARTER'}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving === 'STARTER' ? 'Saving...' : 'Save Starter Features'}
            </button>
          )}
          {hasChanges('OPERATIONS') && (
            <button
              onClick={() => saveTier('OPERATIONS')}
              disabled={saving === 'OPERATIONS'}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving === 'OPERATIONS' ? 'Saving...' : 'Save Operations Features'}
            </button>
          )}
          {!hasChanges('STARTER') && !hasChanges('OPERATIONS') && (
            <span className="text-xs text-slate-400">No unsaved feature changes</span>
          )}
        </div>
      </div>
    </div>
  )
}
