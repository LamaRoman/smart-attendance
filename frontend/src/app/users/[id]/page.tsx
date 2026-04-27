'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import DocumentManager from '@/components/DocumentManager'
import { adToBS, BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits } from '@/components/BSDatePicker'
import {
  ArrowLeft,
  Mail,
  Phone,
  Hash,
  Shield,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  FileText,
  User,
  Loader2,
  AlertCircle,
  Cake,
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeId: string
  phone?: string | null
  role: string
  isActive: boolean
  createdAt: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  dateOfBirth?: string | null
}

const ROLE_LABELS: Record<string, { en: string; np: string; color: string }> = {
  ORG_ADMIN: { en: 'Admin', np: 'प्रशासक', color: 'bg-blue-50 text-blue-700' },
  EMPLOYEE: { en: 'Employee', np: 'कर्मचारी', color: 'bg-slate-100 text-slate-700' },
  SUPER_ADMIN: { en: 'Super Admin', np: 'सुपर प्रशासक', color: 'bg-rose-50 text-rose-700' },
}

// AD datetime string → formatted date based on calendar (isBs) and script (isNp)
function formatDate(dateStr: string, isBs: boolean, isNp: boolean): string {
  const d = new Date(dateStr)
  if (isBs) {
    const bs = adToBS(d)
    const months = isNp ? BS_MONTHS_NP : BS_MONTHS_EN
    return isNp
      ? `${months[bs.month - 1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`
      : `${months[bs.month - 1]} ${bs.day}, ${bs.year}`
  }
  return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// DOB stored as @db.Date (UTC midnight) — parse parts directly to avoid timezone shift
function formatDOB(dateStr: string, isBs: boolean, isNp: boolean): string {
  const [y, m, day] = dateStr.split('T')[0].split('-').map(Number)
  const d = new Date(y, m - 1, day)
  if (isBs) {
    const bs = adToBS(d)
    const months = isNp ? BS_MONTHS_NP : BS_MONTHS_EN
    return isNp
      ? `${months[bs.month - 1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`
      : `${months[bs.month - 1]} ${bs.day}, ${bs.year}`
  }
  return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { user: currentUser, isLoading: authLoading, language, calendarMode } = useAuth()
  const isNp = language === 'NEPALI'
  const isBs = calendarMode === 'NEPALI'

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile')

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/v1/users')
      if (res.error) throw new Error(res.error.message)
      const users = (res.data as UserData[]) || []
      const found = users.find((u) => u.id === userId)
      if (!found) throw new Error('User not found')
      setUserData(found)
    } catch (err: any) {
      setError(err.message || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.role !== 'ORG_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        router.push('/')
        return
      }
      fetchUser()
    }
  }, [authLoading, currentUser, fetchUser, router])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <button
            onClick={() => router.push('/users')}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {isNp ? 'प्रयोगकर्ताहरू' : 'Back to Users'}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <p className="text-sm text-rose-700">{error || 'User not found'}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const roleInfo = ROLE_LABELS[userData.role] || ROLE_LABELS.EMPLOYEE
  const initials = `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase()

  const tabs = [
    { key: 'profile' as const, label: isNp ? 'प्रोफाइल' : 'Profile', icon: User },
    { key: 'documents' as const, label: isNp ? 'कागजातहरू' : 'Documents', icon: FileText },
  ]

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push('/users')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {isNp ? 'प्रयोगकर्ताहरू' : 'Back to Users'}
        </button>

        {/* User Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900">
                {userData.firstName} {userData.lastName}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                {userData.employeeId && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Hash className="h-3 w-3" />
                    {userData.employeeId}
                  </span>
                )}
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}
                >
                  {isNp ? roleInfo.np : roleInfo.en}
                </span>
                {userData.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {isNp ? 'सक्रिय' : 'Active'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                    <XCircle className="h-3 w-3" />
                    {isNp ? 'निष्क्रिय' : 'Inactive'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-[1px] inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label={isNp ? 'इमेल' : 'Email'}
                value={userData.email}
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label={isNp ? 'फोन' : 'Phone'}
                value={userData.phone || (isNp ? 'उपलब्ध छैन' : 'Not provided')}
              />
              <InfoItem
                icon={<Hash className="h-4 w-4" />}
                label={isNp ? 'कर्मचारी आईडी' : 'Employee ID'}
                value={userData.employeeId || '—'}
              />
              <InfoItem
                icon={<Briefcase className="h-4 w-4" />}
                label={isNp ? 'भूमिका' : 'Role'}
                value={isNp ? roleInfo.np : roleInfo.en}
              />
              <InfoItem
                icon={<Cake className="h-4 w-4" />}
                label={isNp ? 'जन्म मिति' : 'Date of birth'}
                value={
                  userData.dateOfBirth
                    ? formatDOB(userData.dateOfBirth, isBs, isNp)
                    : isNp
                      ? 'उपलब्ध छैन'
                      : 'Not provided'
                }
              />
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label={isNp ? 'शिफ्ट समय' : 'Shift Time'}
                value={
                  userData.shiftStartTime && userData.shiftEndTime
                    ? `${userData.shiftStartTime} - ${userData.shiftEndTime}`
                    : isNp
                      ? 'संगठन पूर्वनिर्धारित'
                      : 'Org default'
                }
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label={isNp ? 'सिर्जना मिति' : 'Joined'}
                value={formatDate(userData.createdAt, isBs, isNp)}
              />
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <DocumentManager userId={userId} language={language} />
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Info Item ──
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}
