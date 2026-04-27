'use client'
import { Zap, X, Lock, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradePromptProps {
  mode: 'banner' | 'modal' | 'inline'
  code:
    | 'FEATURE_NOT_AVAILABLE'
    | 'PREVIEW_ONLY'
    | 'SUBSCRIPTION_INACTIVE'
    | 'NO_SUBSCRIPTION'
    | 'EMPLOYEE_LIMIT_REACHED'
  message?: string
  feature?: string
  onDismiss?: () => void
  isNp?: boolean
}

const LABELS = {
  FEATURE_NOT_AVAILABLE: {
    en: 'Feature not available on your plan',
    np: 'यो सुविधा तपाईंको प्लानमा उपलब्ध छैन',
    icon: Lock,
    color: 'amber',
  },
  PREVIEW_ONLY: {
    en: 'Preview only — upgrade to download',
    np: 'प्रिभ्यू मात्र — डाउनलोड गर्न अपग्रेड गर्नुहोस्',
    icon: Eye,
    color: 'blue',
  },
  SUBSCRIPTION_INACTIVE: {
    en: 'Your subscription is inactive',
    np: 'तपाईंको सदस्यता निष्क्रिय छ',
    icon: X,
    color: 'red',
  },
  NO_SUBSCRIPTION: {
    en: 'No active subscription',
    np: 'कुनै सक्रिय सदस्यता छैन',
    icon: X,
    color: 'red',
  },
  EMPLOYEE_LIMIT_REACHED: {
    en: 'Employee limit reached',
    np: 'कर्मचारी सीमा पुगियो',
    icon: Lock,
    color: 'amber',
  },
}

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; icon: string; btn: string; text: string }
> = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    text: 'text-amber-800',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    text: 'text-blue-800',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    text: 'text-red-800',
  },
}

export default function UpgradePrompt({
  mode = 'banner',
  code,
  message,
  onDismiss,
  isNp = false,
}: UpgradePromptProps) {
  const router = useRouter()
  const meta = LABELS[code] ?? LABELS['FEATURE_NOT_AVAILABLE']
  const colors = COLOR_MAP[meta.color]
  const Icon = meta.icon
  const label = isNp ? meta.np : meta.en
  const displayMessage = message ?? label

  const handleUpgrade = () => router.push('/admin/pay')

  // ── Inline mode — small pill inside a card ────────────────
  if (mode === 'inline') {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colors.bg} ${colors.border}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} />
        <p className={`text-xs font-medium ${colors.text} flex-1`}>{displayMessage}</p>
        <button
          onClick={handleUpgrade}
          className="whitespace-nowrap text-xs font-semibold text-violet-600 hover:text-violet-800"
        >
          {isNp ? 'अपग्रेड' : 'Upgrade →'}
        </button>
      </div>
    )
  }

  // ── Banner mode — full-width bar ──────────────────────────
  if (mode === 'banner') {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${colors.bg} ${colors.border} mb-4`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${colors.icon}`} />
        <p className={`text-sm font-medium ${colors.text} flex-1`}>{displayMessage}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpgrade}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${colors.btn}`}
          >
            {isNp ? 'अपग्रेड गर्नुहोस्' : 'Upgrade Plan'}
          </button>
          {onDismiss && (
            <button onClick={onDismiss} className={`${colors.icon} hover:opacity-70`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Modal mode — centered overlay ─────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${colors.bg}`}>
            <Icon className={`h-7 w-7 ${colors.icon}`} />
          </div>
          <div>
            <h3 className="mb-1 text-base font-bold text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500">{displayMessage}</p>
          </div>
          <div className="mt-2 flex w-full gap-3">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {isNp ? 'बन्द' : 'Dismiss'}
              </button>
            )}
            <button
              onClick={handleUpgrade}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Zap className="h-4 w-4" />
              {isNp ? 'अपग्रेड गर्नुहोस्' : 'Upgrade Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
