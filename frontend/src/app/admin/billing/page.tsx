'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import { CheckCircle, XCircle, Crown, Zap, MessageCircle, Mail, Lock } from 'lucide-react'

const FEATURES = [
  { label: 'BS Calendar', starter: true, ops: true },
  { label: 'Geofencing Attendance', starter: true, ops: true },
  { label: 'Nepal Holiday Sync', starter: true, ops: true },
  { label: 'SSF and TDS Calculation', starter: true, ops: true },
  { label: 'Leave Management', starter: true, ops: true },
  { label: 'Basic Payroll', starter: true, ops: true },
  { label: 'Daily Report', starter: true, ops: true },
  { label: 'Weekly and Monthly Reports', starter: false, ops: true },
  { label: 'Payroll Workflow', starter: false, ops: true },
  { label: 'Multi-Month and Annual Reports', starter: false, ops: true },
  { label: 'CSV and PDF Downloads', starter: false, ops: true },
  { label: 'Notifications', starter: false, ops: true },
  { label: 'Onboarding', starter: false, ops: true },
  { label: 'Manual Correction', starter: false, ops: true },
  { label: 'Audit Log', starter: false, ops: true },
]

export default function BillingPage() {
  const { user, isLoading, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading || !user || user.role !== 'ORG_ADMIN') {
      if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login')
      return
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const res = await api.get('/api/v1/org-settings/subscription')
      if (res.data) {
        const d = res.data as any
        setCurrentTier(d?.plan?.tier || 'STARTER')
        setPlanData(d)
      }
      setLoading(false)
    })()
  }, [user])

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800"></div>
        </div>
      </AdminLayout>
    )
  }

  const isStarter = currentTier === 'STARTER'
  const isAnnual = planData?.billingCycle === 'ANNUAL'
  const opsPrice = planData?.plan?.pricePerEmployee ?? 250
  const opsSetupFee = planData?.plan?.defaultSetupFee ?? null
  const annualDiscountPercent = Number(planData?.plan?.annualDiscountPercent ?? 0)
  const annualPrice = Math.round(opsPrice * 12 * (1 - annualDiscountPercent / 100))

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Billing & Plan</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your subscription and plan</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Starter */}
          <div
            className={
              'flex flex-col rounded-xl border-2 p-6 ' +
              (isStarter
                ? 'border-slate-900 bg-white ring-2 ring-slate-900/5'
                : 'border-slate-200 bg-slate-50')
            }
          >
            {isStarter && (
              <span className="mb-4 self-start rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                CURRENT PLAN
              </span>
            )}
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Starter</h2>
            </div>
            <div className="mb-1 mt-2">
              <span className="text-3xl font-bold text-slate-900">FREE</span>
            </div>
            <p className="mb-6 text-xs text-slate-500">Up to 5 employees &mdash; Free forever</p>
            <div className="flex-1 space-y-2.5">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {f.starter ? (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                  )}
                  <span className={'text-xs ' + (f.starter ? 'text-slate-700' : 'text-slate-400')}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
            {isStarter && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="text-center text-xs text-slate-500">You are on this plan</div>
              </div>
            )}
          </div>
          {/* Operations */}
          <div
            className={
              'flex flex-col rounded-xl border-2 p-6 ' +
              (isStarter
                ? 'border-slate-200 bg-white'
                : 'border-emerald-500 bg-white ring-2 ring-emerald-500/10')
            }
          >
            <div className="mb-4 flex items-center gap-2">
              {isStarter ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  RECOMMENDED
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                  CURRENT PLAN
                </span>
              )}
            </div>
            <div className="mb-1 flex items-center gap-2">
              <Crown className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Operations</h2>
            </div>
            <div className="mb-1 mt-2">
              <span className="text-3xl font-bold text-slate-900">Rs. {opsPrice}</span>
              <span className="ml-1 text-sm text-slate-500">/emp/month</span>
              {annualDiscountPercent > 0 && (
                <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-600">
                  {annualDiscountPercent}% off annually
                </span>
              )}
            </div>
            <p className="mb-6 text-xs text-slate-500">
              Up to 100 employees
              {opsSetupFee ? ` — Rs. ${Number(opsSetupFee).toLocaleString()} setup fee` : ''}
            </p>
            <div className="flex-1 space-y-2.5">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  <span className="text-xs text-slate-700">{f.label}</span>
                </div>
              ))}
            </div>
            {isStarter ? (
              <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-4">
                {annualDiscountPercent > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <p className="text-[11px] text-violet-700">
                      Pay annually — save {annualDiscountPercent}% (Rs. {annualPrice}/emp/yr)
                    </p>
                  </div>
                )}
                <a
                  href="https://wa.me/9779761154213?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Operations%20plan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Upgrade via WhatsApp
                </a>
                <a
                  href="mailto:support@zentaralabs.com?subject=Upgrade%20to%20Operations"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Mail className="h-4 w-4" />
                  Upgrade via Email
                </a>
              </div>
            ) : (
              <div className="mt-6 border-t border-emerald-100 pt-4">
                <div className="text-center text-xs font-medium text-emerald-600">
                  You are on this plan
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Need help?</h3>
          <p className="mb-3 text-xs text-slate-500">
            Contact us for billing questions or upgrades.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/9779761154213"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" /> +977 9761154213
            </a>
            <a
              href="mailto:support@zentaralabs.com"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> support@zentaralabs.com
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
