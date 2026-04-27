'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import {
  LogOut,
  Shield,
  Clock,
  CheckCircle,
  CalendarDays,
  Timer,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
  BarChart2,
} from 'lucide-react'
import PoweredBy from '@/components/PoweredBy'

interface AttendanceStatus {
  isClockedIn: boolean
  record: {
    id: string
    checkInTime: string
  } | null
  currentDuration: {
    minutes: number
    formatted: string
  } | null
}

interface AttendanceRecord {
  id: string
  checkInTime: string
  checkOutTime: string | null
  duration: number | null
  status: string
}

export default function EmployeeDashboard() {
  const { user, isLoading, logout, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const [status, setStatus] = useState<AttendanceStatus | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      loadStatus()
      loadRecords()
    }
  }, [user])

  useEffect(() => {
    if (user && status?.isClockedIn) {
      const interval = setInterval(loadStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user, status?.isClockedIn])

  const loadStatus = async () => {
    const res = await api.get('/api/v1/attendance/status')
    if (res.data) setStatus(res.data as AttendanceStatus)
  }

  const loadRecords = async () => {
    const res = await api.get('/api/v1/attendance/my?limit=10')
    if (res.data) setRecords((res.data as { records: AttendanceRecord[] }).records)
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return isNp ? `${h} ${h > 0 ? 'घण्टा' : ''} ${m} मिनेट` : `${h}h ${m}m`
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-lg px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {isNp ? 'मेरो उपस्थिति' : 'My Attendance'}
                </h1>
                <p className="text-xs text-gray-500">
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/my-info')}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title={isNp ? 'मेरो विवरण' : 'My Info'}
              >
                <CreditCard className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push('/leaves')}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title={isNp ? 'बिदा' : 'Leaves'}
              >
                <CalendarDays className="h-5 w-5" />
              </button>
              <button
                onClick={logout}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-6">
        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button onClick={() => setError('')}>
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}
        {message && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700">{message}</span>
            </div>
            <button onClick={() => setMessage('')}>
              <X className="h-4 w-4 text-green-400" />
            </button>
          </div>
        )}

        {/* Status Card */}
        <div
          className={`overflow-hidden rounded-xl shadow-lg ${
            status?.isClockedIn
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-gray-100 to-gray-200'
          }`}
        >
          <div className="p-8 text-center">
            {status?.isClockedIn ? (
              <>
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <p className="text-xl font-bold text-white">
                  {isNp ? 'चेक इन भएको' : 'Clocked In'}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {isNp ? 'देखि' : 'Since'}{' '}
                  {status.record ? formatTime(status.record.checkInTime) : ''}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3">
                  <Timer className="h-5 w-5 text-white" />
                  <span className="text-2xl font-bold text-white">
                    {status.currentDuration?.formatted}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/60">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-xl font-bold text-gray-700">
                  {isNp ? 'चेक इन भएको छैन' : 'Not Clocked In'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {isNp ? 'मोबाइल एपबाट चेक इन गर्नुहोस्' : 'Use the mobile app to clock in'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/leaves')}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="rounded-lg bg-slate-100 p-2">
              <CalendarDays className="h-5 w-5 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'बिदा माग्नुहोस्' : 'Request Leave'}
            </span>
          </button>
          <button
            onClick={() => router.push('/my-info')}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="rounded-lg bg-blue-100 p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'मेरो विवरण' : 'My Info'}
            </span>
          </button>
          <button
            onClick={() => router.push('/employee/attendance')}
            className="col-span-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="rounded-lg bg-violet-100 p-2">
              <BarChart2 className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'उपस्थिति इतिहास' : 'Attendance History'}
            </span>
          </button>
          <button
            onClick={() => router.push('/employee/my-salary')}
            className="col-span-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="rounded-lg bg-emerald-100 p-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'मेरो तलब' : 'My Salary & Payslips'}
            </span>
          </button>
        </div>

        {/* Recent History */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {isNp ? 'हालको इतिहास' : 'Recent History'}
            </h2>
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(record.checkInTime)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatTime(record.checkInTime)}
                      {record.checkOutTime && <> → {formatTime(record.checkOutTime)}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        record.status === 'CHECKED_IN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {record.status === 'CHECKED_IN'
                        ? isNp
                          ? 'सक्रिय'
                          : 'Active'
                        : isNp
                          ? 'पूरा'
                          : 'Done'}
                    </span>
                    {record.duration && (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDuration(record.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    {isNp ? 'अहिलेसम्म कुनै रेकर्ड छैन' : 'No records yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PoweredBy />
    </div>
  )
}
