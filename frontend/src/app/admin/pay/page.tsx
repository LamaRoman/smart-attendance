'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import {
  Copy,
  CheckCircle2,
  MessageCircle,
  Building2,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  Zap,
  Users,
  Loader2,
  CreditCard,
} from 'lucide-react'

// ─── Static config — non-pricing constants only ────────────────────────────────
const WHATSAPP_NUMBER = '9779761154213'
const BANK_ACCOUNT = '00101234567890'
const ESEWA_ID = '9800000000'
const KHALTI_ID = '9800000000'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1.5 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center">
        <span
          className={`text-sm font-medium text-slate-800 ${mono ? 'font-mono tracking-wide' : ''}`}
        >
          {value}
        </span>
        {mono && <CopyButton text={value} />}
      </div>
    </div>
  )
}

function Accordion({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-100 bg-white px-5 pb-5 pt-2">{children}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PayPage() {
  const { user, isLoading, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [planTier, setPlanTier] = useState<string | null>(null)
  const [planDisplayName, setPlanDisplayName] = useState<string>('')
  const [effectivePrice, setEffectivePrice] = useState<number>(0)
  const [planDefaultPrice, setPlanDefaultPrice] = useState<number>(0)
  const [setupFeeAmount, setSetupFeeAmount] = useState<number | null>(null)
  const [setupFeeWaived, setSetupFeeWaived] = useState(false)
  const [setupFeePaid, setSetupFeePaid] = useState(false)
  const [subStatus, setSubStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<string>('MONTHLY')
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState<number>(0)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role !== 'ORG_ADMIN') return
    ;(async () => {
      setFetching(true)
      const [usersRes, subRes] = await Promise.all([
        api.get('/api/v1/users'),
        api.get('/api/v1/org-settings/subscription'),
      ])
      if (usersRes.error) {
        setFetchError(usersRes.error.message)
      } else if (Array.isArray(usersRes.data)) {
        const active = (usersRes.data as any[]).filter((u) => u.role === 'EMPLOYEE' && u.isActive)
        setEmployeeCount(active.length)
      }
      if (subRes.data) {
        const sub = subRes.data as any
        setPlanTier(sub?.plan?.tier ?? null)
        setPlanDisplayName(sub?.plan?.displayName ?? '')

        // Plan default price — what plan charges without overrides
        const defaultPrice = Number(sub?.plan?.pricePerEmployee ?? 0)
        setPlanDefaultPrice(defaultPrice)

        // Effective price — custom override takes precedence
        const price =
          sub?.customPricePerEmployee !== null && sub?.customPricePerEmployee !== undefined
            ? Number(sub.customPricePerEmployee)
            : defaultPrice
        setEffectivePrice(price)

        // Setup fee state
        setSetupFeeWaived(sub?.setupFeeWaived ?? false)
        setSetupFeePaid(sub?.setupFeePaid ?? false)
        setSubStatus(sub?.status ?? null)
        setTrialEndsAt(sub?.trialEndsAt ?? null)
        setBillingCycle(sub?.billingCycle ?? 'MONTHLY')
        setAnnualDiscountPercent(Number(sub?.plan?.annualDiscountPercent ?? 0))
        // Show setup fee only if not yet paid and not waived
        if (!sub?.setupFeeWaived && !sub?.setupFeePaid) {
          const fee = sub?.setupFeeAmount ?? sub?.plan?.defaultSetupFee ?? null
          setSetupFeeAmount(fee !== null ? Number(fee) : null)
        }
      }
      setFetching(false)
    })()
  }, [user])

  if (isLoading || fetching) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      </AdminLayout>
    )
  }
  if (!user) return null

  if (fetchError) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {fetchError}
        </div>
      </AdminLayout>
    )
  }

  const count = employeeCount ?? 0
  const isOperations = planTier === 'OPERATIONS'
  const isStarter = planTier === 'STARTER' || !planTier
  const billable = isOperations ? count : 0
  const free = isStarter ? count : 0
  const monthlyTotal = isOperations ? billable * effectivePrice : 0
  const isAnnual = billingCycle === 'ANNUAL'
  const annualTotal = isOperations ? monthlyTotal * 12 * (1 - annualDiscountPercent / 100) : 0
  const annualSavings = isOperations ? monthlyTotal * 12 - annualTotal : 0
  const displayTotal = isAnnual ? annualTotal : monthlyTotal

  const orgName = user.organization?.name ?? ''
  const month = new Date().toLocaleString('en-NP', { month: 'long', year: 'numeric' })

  const whatsappMessage = encodeURIComponent(
    `Hi! Sending payment receipt for Smart Attendance.\n\nOrg: ${orgName}\nEmployees: ${count}\nAmount: Rs. ${monthlyTotal.toLocaleString()}\nMonth: ${month}\n\n[Attach screenshot here]`,
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Trial banner */}
        {subStatus === 'TRIALING' && trialEndsAt && planTier !== 'STARTER' && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Loader2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {isNp ? 'नि:शुल्क परीक्षण अवधि' : 'Free Trial Active'}
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                {isNp
                  ? `परीक्षण अवधि ${new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} मा समाप्त हुन्छ`
                  : `Trial ends on ${new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              {isNp ? 'परीक्षण' : 'Trial'}
            </span>
          </div>
        )}
        {/* Grace period banner */}
        {subStatus === 'GRACE_PERIOD' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {isNp ? 'भुक्तानी आवश्यक छ' : 'Payment Required'}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {isNp
                  ? 'तपाईंको परीक्षण अवधि समाप्त भयो। सेवा जारी राख्न कृपया भुक्तानी गर्नुहोस्।'
                  : 'Your trial has ended. Please make a payment to continue using all features.'}
              </p>
            </div>
          </div>
        )}
        {/* Subscription status banner */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <Zap className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500">{isNp ? 'हालको प्लान' : 'Current Plan'}</p>
            <p className="text-sm font-semibold text-slate-900">
              {isStarter
                ? isNp
                  ? 'स्टार्टर — निःशुल्क'
                  : 'Starter — Free'
                : isNp
                  ? `${planDisplayName} — Rs. ${effectivePrice}/कर्मचारी`
                  : `${planDisplayName} — Rs. ${effectivePrice}/employee`}
            </p>
            {/* Show if org has a custom price different from plan default */}
            {isOperations && effectivePrice !== planDefaultPrice && (
              <p className="mt-0.5 text-[11px] text-violet-600">
                {isNp
                  ? `अनुकूलित मूल्य (योजना पूर्वनिर्धारित: Rs. ${planDefaultPrice})`
                  : `Custom rate (plan default: Rs. ${planDefaultPrice}/emp)`}
              </p>
            )}
          </div>
          {isStarter && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
              {isNp ? 'निःशुल्क' : 'Free tier'}
            </span>
          )}
        </div>

        {/* Setup fee notice — only shown if due */}
        {setupFeeAmount !== null && !setupFeeWaived && !setupFeePaid && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {isNp
                  ? `एक पटकको सेटअप शुल्क: Rs. ${setupFeeAmount.toLocaleString()}`
                  : `One-time setup fee due: Rs. ${setupFeeAmount.toLocaleString()}`}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {isNp
                  ? 'यो शुल्क प्लान सक्रिय गर्दा एक पटक मात्र लाग्छ।'
                  : 'This one-time fee applies when activating your plan. Contact us if you have questions.'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isNp ? 'भुक्तानी' : 'Subscription & Payment'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {month}
            {orgName ? ` · ${orgName}` : ''}
          </p>
        </div>

        {/* Bill summary — dark card */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border border-slate-700/50" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border border-slate-700/50" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-400">
                  {isNp ? 'बाँकी रकम' : 'Amount Due'}
                </p>
                <p className="text-4xl font-bold text-white">
                  {displayTotal === 0
                    ? isNp
                      ? 'निःशुल्क'
                      : 'Free'
                    : `Rs. ${Math.round(displayTotal).toLocaleString()}`}
                  {displayTotal > 0 && (
                    <span className="ml-1 text-base font-normal text-slate-400">
                      {isAnnual ? '/ yr' : '/ mo'}
                    </span>
                  )}
                </p>
                {isAnnual && annualSavings > 0 && (
                  <p className="mt-1 text-xs font-medium text-emerald-400">
                    You save Rs. {Math.round(annualSavings).toLocaleString()} vs monthly
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                {planDisplayName || (isNp ? 'स्टार्टर' : 'Starter')}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">
                    {isNp ? 'कुल कर्मचारी' : 'Active staff'}
                  </span>
                </div>
                <p className="text-lg font-bold text-white">{count}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">
                    {isNp ? 'निःशुल्क स्लट' : 'Free slots'}
                  </span>
                </div>
                <p className="text-lg font-bold text-white">{free}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">{isNp ? 'दर' : 'Rate'}</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {isStarter ? (
                    '—'
                  ) : (
                    <span>
                      Rs.{effectivePrice}
                      <span className="text-xs text-slate-400">/ea</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {billable > 0
                ? isAnnual
                  ? `${billable} ${isNp ? 'बिलयोग्य कर्मचारी' : 'billable employees'} × Rs. ${effectivePrice} × 12 mo${annualDiscountPercent > 0 ? ` − ${annualDiscountPercent}%` : ''} = Rs. ${Math.round(annualTotal).toLocaleString()}`
                  : `${billable} ${isNp ? 'बिलयोग्य कर्मचारी' : 'billable employees'} × Rs. ${effectivePrice} = Rs. ${monthlyTotal.toLocaleString()}`
                : isNp
                  ? 'यस महिना कुनै भुक्तानी आवश्यक छैन 🎉'
                  : 'No payment needed this month 🎉'}
            </p>
          </div>
        </div>

        {/* Pricing tiers reference — dynamic from API */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isNp ? 'मूल्य निर्धारण' : 'Pricing Tiers'}
          </p>
          <div className="space-y-1">
            {/* Starter row */}
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${isStarter ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>{isNp ? '१–५ कर्मचारी' : 'Up to 5 employees'}</span>
              <span className={`font-semibold ${isStarter ? 'text-white' : 'text-slate-800'}`}>
                {isNp ? 'निःशुल्क' : 'Free'}
              </span>
            </div>
            {/* Operations row — price from API */}
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${isOperations ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>{isNp ? '६–१०० कर्मचारी' : '6–100 employees'}</span>
              <span className={`font-semibold ${isOperations ? 'text-white' : 'text-slate-800'}`}>
                Rs. {isOperations ? effectivePrice : planDefaultPrice}/
                {isNp ? 'कर्मचारी' : 'employee'}
              </span>
            </div>
            {/* Enterprise row */}
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <span>{isNp ? '१००+ कर्मचारी' : '100+ employees'}</span>
              <span className="font-semibold text-slate-800">
                {isNp ? 'सम्पर्क गर्नुहोस्' : 'Contact us'}
              </span>
            </div>
          </div>
        </div>

        {/* Annual upsell — only for monthly Operations orgs when discount is configured */}
        {isOperations && !isAnnual && annualDiscountPercent > 0 && monthlyTotal > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Zap className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-900">
                {isNp
                  ? `वार्षिक भुक्तानीमा ${annualDiscountPercent}% छुट पाउनुहोस्`
                  : `Save ${annualDiscountPercent}% with annual billing`}
              </p>
              <p className="mt-0.5 text-xs text-violet-600">
                {isNp
                  ? `Rs. ${Math.round(annualTotal).toLocaleString()}/वर्ष — Rs. ${Math.round(annualSavings).toLocaleString()} बचत हुन्छ। हाम्रो टिमलाई सम्पर्क गर्नुहोस्।`
                  : `Rs. ${Math.round(annualTotal).toLocaleString()}/yr — you save Rs. ${Math.round(annualSavings).toLocaleString()}. Contact us to switch.`}
              </p>
            </div>
          </div>
        )}
        {/* Upgrade upsell — for Starter orgs, promote Operations + annual discount */}
        {isStarter && annualDiscountPercent > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Zap className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-900">
                {isNp
                  ? `Operations मा अपग्रेड गर्नुहोस् — वार्षिक भुक्तानीमा ${annualDiscountPercent}% छुट`
                  : `Upgrade to Operations — save ${annualDiscountPercent}% with annual billing`}
              </p>
              <p className="mt-0.5 text-xs text-violet-600">
                {isNp
                  ? 'पूर्ण सुविधाहरू अनलक गर्नुहोस्। मासिक वा वार्षिक भुक्तानी छनौट गर्नुहोस् — वार्षिकमा बढी बचत। हाम्रो टिमलाई सम्पर्क गर्नुहोस्।'
                  : 'Unlock all features. Choose monthly or annual billing — pay annually and save more. Contact us to get started.'}
              </p>
            </div>
          </div>
        )}
        {/* Payment options — only when there's an amount due */}
        {monthlyTotal > 0 && (
          <>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                {isNp ? 'भुक्तानी विकल्पहरू' : 'Payment Options'}
              </p>
              <Accordion
                title={isNp ? 'बैंक ट्रान्सफर' : 'Bank Transfer'}
                icon={Building2}
                defaultOpen
              >
                <div className="mt-2">
                  <DetailRow label={isNp ? 'बैंक' : 'Bank'} value="Nepal Investment Bank (NIBL)" />
                  <DetailRow
                    label={isNp ? 'खाता नाम' : 'Account Name'}
                    value="Smart Attendance Pvt. Ltd."
                  />
                  <DetailRow
                    label={isNp ? 'खाता नम्बर' : 'Account Number'}
                    value={BANK_ACCOUNT}
                    mono
                  />
                  <DetailRow label={isNp ? 'शाखा' : 'Branch'} value="Newroad, Kathmandu" />
                  <DetailRow
                    label={isNp ? 'विवरण (Remarks)' : 'Remarks'}
                    value={`${orgName} - ${month}`}
                    mono
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    {isNp
                      ? 'विवरण (Remarks) मा आफ्नो संस्थाको नाम र महिना अवश्य लेख्नुहोस्।'
                      : 'Always include your org name and month in the Remarks so we can match your payment.'}
                  </p>
                </div>
              </Accordion>
              <Accordion
                title={isNp ? 'eSewa / Khalti / मोबाइल बैंकिङ' : 'eSewa / Khalti / Mobile Banking'}
                icon={Smartphone}
              >
                <div className="mt-2">
                  <DetailRow label="eSewa ID" value={ESEWA_ID} mono />
                  <DetailRow label="Khalti ID" value={KHALTI_ID} mono />
                  <DetailRow label={isNp ? 'नाम' : 'Name'} value="Smart Attendance Pvt. Ltd." />
                </div>
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div className="flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <div className="grid grid-cols-4 gap-0.5 opacity-20">
                      {[1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1].map((v, i) => (
                        <div key={i} className={`h-5 w-5 rounded-sm ${v ? 'bg-slate-800' : ''}`} />
                      ))}
                    </div>
                    <p className="px-2 text-center text-[10px] leading-tight">
                      {isNp ? 'QR इमेज यहाँ राख्नुहोस्' : 'Replace with\nyour QR image'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isNp
                      ? `Rs. ${monthlyTotal.toLocaleString()} तिर्न स्क्यान गर्नुहोस्`
                      : `Scan to pay Rs. ${monthlyTotal.toLocaleString()}`}
                  </p>
                </div>
              </Accordion>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs text-slate-400">
                  {isNp ? 'भुक्तानी पछि' : 'After paying'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {isNp ? 'WhatsApp मा रसिद पठाउनुहोस्' : 'Send your receipt via WhatsApp'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {isNp
                      ? 'भुक्तानी गरेपछि स्क्रिनसट लिनुहोस् र सिधै WhatsApp मा पठाउनुहोस्। कुनै अपलोड वा फारम भर्नु पर्दैन।'
                      : 'After paying, screenshot your confirmation and send it to us on WhatsApp. No uploads, no forms — just one tap.'}
                  </p>
                </div>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {isNp ? 'WhatsApp मा रसिद पठाउनुहोस्' : 'Send Receipt on WhatsApp'}
              </a>
              <p className="mt-2.5 text-center text-[11px] text-slate-400">
                {isNp
                  ? '१ कार्य दिनभित्र भुक्तानी प्रमाणित हुनेछ'
                  : 'Payment verified within 1 business day'}
              </p>
            </div>
          </>
        )}

        {/* Enterprise contact card */}
        {planTier === 'ENTERPRISE' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {isNp
                    ? 'अनुकूलित मूल्यको लागि सम्पर्क गर्नुहोस्'
                    : 'Get a custom enterprise quote'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {isNp
                    ? 'तपाईंको संस्थामा १०० भन्दा बढी कर्मचारी छन्। विशेष मूल्य निर्धारणको लागि हामीसंग सम्पर्क गर्नुहोस्।'
                    : 'Your organization has more than 100 employees. Contact us on WhatsApp for a custom pricing plan.'}
                </p>
              </div>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I'd like enterprise pricing for ${orgName} (${count} employees).`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {isNp ? 'WhatsApp मा सम्पर्क गर्नुहोस्' : 'Contact us on WhatsApp'}
            </a>
          </div>
        )}

        {/* Due date notice */}
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Calendar className="h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            {isNp ? (
              'भुक्तानी प्रत्येक महिनाको ५ तारिखसम्म गर्नुहोस्। ढिलो भुक्तानीले प्रिमियम सुविधाहरूमा असर गर्न सक्छ।'
            ) : (
              <>
                <strong>Payment is due by the 5th of each month.</strong> Late payments may restrict
                access to premium features.
              </>
            )}
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
