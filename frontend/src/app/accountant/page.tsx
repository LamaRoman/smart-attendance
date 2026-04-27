'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import AccountantLayout from '@/components/AccountantLayout'
import {
  Clock,
  FileText,
  CreditCard,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function AccountantDashboard() {
  const { user, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'
  const [autoClosedCount, setAutoClosedCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await api.get('/api/v1/attendance?status=AUTO_CLOSED&limit=50&offset=0')
        const records = (res.data as any)?.records || []
        const unreviewed = records.filter((r: any) => !r.reviewedByAccountant)
        setAutoClosedCount(unreviewed.length)
      } catch {
        setAutoClosedCount(0)
      }
    }
    fetchPending()
  }, [])

  const now = new Date()
  const dateLabel = now.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const quickLinks = [
    {
      label: isNp ? 'उपस्थिति' : 'Attendance',
      desc: isNp ? 'AUTO_CLOSED रेकर्ड सच्याउनुहोस्' : 'Review and correct AUTO_CLOSED records',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      path: '/accountant/attendance',
      badge: autoClosedCount !== null && autoClosedCount > 0 ? autoClosedCount : null,
    },
    {
      label: isNp ? 'प्रतिवेदन' : 'Reports',
      desc: isNp ? 'मासिक र वार्षिक तलब प्रतिवेदन' : 'Monthly and annual payroll reports',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      path: '/accountant/reports',
      badge: null,
    },
    {
      label: isNp ? 'तलब' : 'Payroll',
      desc: isNp ? 'तलब रेकर्ड हेर्नुहोस्' : 'View payroll records',
      icon: CreditCard,
      color: 'bg-emerald-50 text-emerald-600',
      path: '/payroll',
      badge: null,
    },
    {
      label: isNp ? 'बिदा' : 'Leaves',
      desc: isNp ? 'कर्मचारी बिदा अनुरोध' : 'Employee leave requests',
      icon: CalendarDays,
      color: 'bg-orange-50 text-orange-600',
      path: '/leaves',
      badge: null,
    },
  ]

  return (
    <AccountantLayout>
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-slate-900">
              {isNp ? 'नमस्ते,' : 'Hello,'} {user?.firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
          </div>
        </div>

        {/* AUTO_CLOSED alert */}
        {autoClosedCount !== null && autoClosedCount > 0 && (
          <div
            onClick={() => router.push('/accountant/attendance')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
          >
            <div className="shrink-0 rounded-lg bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {isNp
                  ? `${autoClosedCount} AUTO_CLOSED रेकर्डहरू सच्याउन बाँकी`
                  : `${autoClosedCount} AUTO_CLOSED record${autoClosedCount === 1 ? '' : 's'} need checkout correction`}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {isNp
                  ? 'क्लिक गर्नुहोस् र चेकआउट समय अपडेट गर्नुहोस्'
                  : 'Click to review and update checkout times'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
          </div>
        )}

        {autoClosedCount === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="shrink-0 rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-800">
              {isNp ? 'सबै उपस्थिति रेकर्डहरू ठीक छन्' : 'All attendance records are in order'}
            </p>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-slate-500">
            {isNp ? 'द्रुत पहुँच' : 'Quick access'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <div
                key={link.path}
                onClick={() => router.push(link.path)}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className={`shrink-0 rounded-xl p-3 ${link.color}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                    {link.badge && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{link.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AccountantLayout>
  )
}
