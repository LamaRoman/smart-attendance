'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut as LogOutIcon,
  User,
  Loader2,
  Globe,
  Smartphone,
  Lock,
} from 'lucide-react'
import PoweredBy from '@/components/PoweredBy'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function CheckinPageContent() {
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('NEPALI')
  const [step, setStep] = useState<'input' | 'locating' | 'processing' | 'success' | 'error'>(
    'input',
  )
  const [orgInfo, setOrgInfo] = useState<{
    name: string
    attendanceMode: string
    geofenceEnabled: boolean
  } | null>(null)
  const [result, setResult] = useState<{
    action: string
    message: string
    user: { firstName: string; lastName: string; employeeId: string }
    record: { checkInTime: string; checkOutTime?: string; duration?: number }
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const isNp = lang === 'NEPALI'

  // Fetch org info
  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(API_URL + '/api/v1/attendance/org-mode/' + orgId)
        const data = await res.json()
        if (data.data) setOrgInfo(data.data)
      } catch {
        /* ignore */
      }
      setLoading(false)
    })()
  }, [orgId])

  const handleSubmit = async () => {
    if (!employeeId.trim()) {
      setErrorMsg(isNp ? 'कृपया कर्मचारी आईडी हाल्नुहोस्' : 'Please enter your Employee ID')
      return
    }
    // S-02 fix: PIN is required
    if (!pin.trim()) {
      setErrorMsg(isNp ? 'कृपया PIN हाल्नुहोस्' : 'Please enter your PIN')
      return
    }

    setStep('locating')
    setErrorMsg('')

    // Get GPS location
    if (!navigator.geolocation) {
      setStep('error')
      setErrorMsg(
        isNp ? 'तपाईंको ब्राउजरले GPS सपोर्ट गर्दैन' : 'Your browser does not support GPS',
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStep('processing')
        try {
          const response = await fetch(API_URL + '/api/v1/attendance/mobile-checkin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // CSRF header required by backend for POST requests
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              employeeId: employeeId.trim().toUpperCase(),
              pin: pin.trim(),
              organizationId: orgId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy, // G-02: send accuracy
            }),
          })
          const data = await response.json()
          if (!response.ok) {
            setStep('error')
            setErrorMsg(data.error?.message || (isNp ? 'त्रुटि भयो' : 'Something went wrong'))
            return
          }
          setResult(data.data)
          setStep('success')
          setPin('') // Clear PIN immediately after success
          setTimeout(() => {
            setStep('input')
            setEmployeeId('')
            setResult(null)
          }, 10000) // F-03: increased from 8s to 10s
        } catch (err) {
          setStep('error')
          setErrorMsg(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server')
        }
      },
      (err) => {
        setStep('error')
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg(
            isNp ? 'कृपया GPS अनुमति दिनुहोस्' : 'Please allow location access to check in',
          )
        } else if (err.code === err.TIMEOUT) {
          setErrorMsg(
            isNp
              ? 'GPS समय सकियो। कृपया खुला ठाउँमा पुनः प्रयास गर्नुहोस्'
              : 'GPS timed out. Please try again in an open area',
          )
        } else {
          setErrorMsg(isNp ? 'स्थान प्राप्त गर्न सकिएन' : 'Could not get your location')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // F-02: reduced from 15s to 10s
        maximumAge: 10000, // F-02: accept cached position up to 10s old
      },
    )
  }

  const handleReset = () => {
    setStep('input')
    setEmployeeId('')
    setPin('')
    setResult(null)
    setErrorMsg('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!orgId || !orgInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {isNp ? 'अमान्य लिङ्क' : 'Invalid Link'}
          </h1>
          <p className="text-sm text-gray-500">
            {isNp
              ? 'कृपया सही चेक-इन लिङ्क प्रयोग गर्नुहोस्।'
              : 'Please use the correct check-in link from your organization.'}
          </p>
        </div>
      </div>
    )
  }

  if (orgInfo.attendanceMode === 'QR_ONLY') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {isNp ? 'मोबाइल चेक-इन उपलब्ध छैन' : 'Mobile Check-in Not Available'}
          </h1>
          <p className="text-sm text-gray-500">
            {isNp
              ? 'कृपया कार्यालयमा रहेको QR कोड स्क्यान गर्नुहोस्।'
              : 'Please scan the QR code at your office.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Language toggle */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={() => setLang(isNp ? 'ENGLISH' : 'NEPALI')}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-white hover:shadow-md"
        >
          <Globe className="h-3.5 w-3.5" />
          {isNp ? 'EN' : 'ने'}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNp ? 'मोबाइल चेक-इन' : 'Mobile Check-in'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{orgInfo.name}</p>
          </div>

          {/* Input Step */}
          {step === 'input' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              {/* Employee ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {isNp ? 'कर्मचारी आईडी' : 'Employee ID'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value.trim())
                      setErrorMsg('')
                    }}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && document.getElementById('pin-input')?.focus()
                    }
                    placeholder="1001"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pl-11 pr-4 text-center font-mono text-lg uppercase tracking-wider transition-colors focus:border-slate-800 focus:outline-none"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* PIN — S-02 fix */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {isNp ? 'PIN' : 'PIN'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      // Only allow digits
                      const val = e.target.value.replace(/\D/g, '')
                      setPin(val)
                      setErrorMsg('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pl-11 pr-4 text-center font-mono text-lg tracking-[0.5em] transition-colors focus:border-slate-800 focus:outline-none"
                    autoComplete="off"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-sm text-red-600">{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!employeeId.trim() || !pin.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:from-slate-700 hover:to-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MapPin className="h-5 w-5" />
                {isNp ? 'चेक इन / आउट' : 'Check In / Out'}
              </button>

              <p className="text-center text-xs text-slate-400">
                <MapPin className="mr-1 inline h-3 w-3" />
                {isNp ? 'GPS स्थान प्रयोग गरिनेछ' : 'Your GPS location will be verified'}
              </p>
            </div>
          )}

          {/* Locating Step */}
          {step === 'locating' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-8 w-8 animate-pulse text-blue-500" />
              </div>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">
                {isNp ? 'स्थान पत्ता लगाउँदै...' : 'Getting your location...'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp ? 'कृपया प्रतीक्षा गर्नुहोस्' : 'Please wait'}
              </p>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">
                {isNp ? 'प्रशोधन हुँदैछ...' : 'Processing...'}
              </h2>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && result && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
              <div
                className={
                  'mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full ' +
                  (result.action === 'CLOCK_IN' ? 'bg-emerald-100' : 'bg-blue-100')
                }
              >
                {result.action === 'CLOCK_IN' ? (
                  <LogIn className="h-10 w-10 text-emerald-600" />
                ) : (
                  <LogOutIcon className="h-10 w-10 text-blue-600" />
                )}
              </div>
              <h2
                className={
                  'mb-1 text-xl font-bold ' +
                  (result.action === 'CLOCK_IN' ? 'text-emerald-700' : 'text-blue-700')
                }
              >
                {result.action === 'CLOCK_IN'
                  ? isNp
                    ? 'चेक इन सफल!'
                    : 'Checked In!'
                  : isNp
                    ? 'चेक आउट सफल!'
                    : 'Checked Out!'}
              </h2>
              <p className="mb-1 text-base font-semibold text-slate-900">
                {result.user.firstName} {result.user.lastName}
              </p>
              <p className="mb-1 text-sm text-slate-500">{result.user.employeeId}</p>
              <p className="text-sm text-slate-500">
                {result.action === 'CLOCK_IN'
                  ? new Date(result.record.checkInTime).toLocaleTimeString()
                  : new Date(result.record.checkOutTime!).toLocaleTimeString()}
              </p>
              {result.record.duration != null && (
                <p className="mt-1 text-sm text-slate-400">
                  {isNp ? 'अवधि' : 'Duration'}: {Math.floor(result.record.duration / 60)}h{' '}
                  {result.record.duration % 60}m
                </p>
              )}
              <button
                onClick={handleReset}
                className="mt-4 text-sm text-slate-500 underline hover:text-slate-700"
              >
                {isNp ? 'फेरि चेक गर्नुहोस्' : 'Check again'}
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-red-700">
                {isNp ? 'त्रुटि' : 'Error'}
              </h2>
              <p className="mb-4 text-sm text-slate-600">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                {isNp ? 'पुनः प्रयास' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      </div>
      <PoweredBy />
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <CheckinPageContent />
    </Suspense>
  )
}
