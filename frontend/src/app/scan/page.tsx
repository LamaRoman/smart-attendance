'use client'

import { useState, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Shield,
  Clock,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut as LogOutIcon,
  User,
  Loader2,
  ArrowLeft,
  Globe,
  Lock,
  MapPin,
} from 'lucide-react'
import PoweredBy from '@/components/PoweredBy'
import { BS_MONTHS_EN, BS_MONTHS_NP, toNepaliDigits } from '@/components/BSDatePicker'
import { t } from '@/lib/i18n'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function ScanPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  // Signature is legacy — PR 6 made it optional. Read it so we can forward
  // it on the off-chance a very old backend is somehow in the loop, but
  // don't require it for the "valid QR" check below.
  const signature = searchParams.get('signature')

  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('ENGLISH')
  const [step, setStep] = useState<'input' | 'locating' | 'processing' | 'success' | 'error'>(
    'input',
  )
  const [result, setResult] = useState<{
    action: string
    message: string
    user: { firstName: string; lastName: string; employeeId: string }
    record: {
      checkInTime: string
      checkOutTime?: string
      duration?: number
      bsYear: number
      bsMonth: number
      bsDay: number
    }
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isNp = lang === 'NEPALI'
  const isValidQR = !!token

  const handleSubmit = async () => {
    if (submitting) return

    if (!employeeId.trim()) {
      setErrorMsg(isNp ? 'कृपया कर्मचारी आईडी हाल्नुहोस्' : 'Please enter your Employee ID')
      return
    }
    if (!pin.trim() || pin.length !== 4) {
      setErrorMsg(isNp ? 'कृपया ४ अंकको PIN हाल्नुहोस्' : 'Please enter your 4-digit PIN')
      return
    }
    if (!isValidQR) {
      setErrorMsg(isNp ? 'अमान्य QR कोड' : 'Invalid QR code')
      return
    }

    if (!navigator.geolocation) {
      setStep('error')
      setErrorMsg(
        isNp ? 'तपाईंको ब्राउजरले GPS सपोर्ट गर्दैन' : 'Your browser does not support GPS',
      )
      return
    }

    setSubmitting(true)
    setStep('locating')
    setErrorMsg('')
    setErrorCode('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStep('processing')
        try {
          // Include signature only when present, so old printed QRs that
          // still carry ?signature= keep working against updated backends,
          // and new scans without it work too. The backend ignores the
          // signature value either way (PR 6).
          const qrPayload = signature
            ? JSON.stringify({ token, signature })
            : JSON.stringify({ token })
          const response = await fetch(`${API_URL}/api/v1/attendance/scan-public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qrPayload,
              employeeId: employeeId.trim().toUpperCase(),
              pin,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            setStep('error')
            setErrorCode(data.error?.code || '')
            setErrorMsg(data.error?.message || '')
            setSubmitting(false)
            return
          }

          setResult(data.data)
          setStep('success')
          setPin('')

          timeoutRef.current = setTimeout(() => {
            setStep('input')
            setEmployeeId('')
            setPin('')
            setResult(null)
            setSubmitting(false)
          }, 8000)
        } catch (err) {
          setStep('error')
          setErrorMsg(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server')
          setSubmitting(false)
        }
      },
      (err) => {
        setStep('error')
        setSubmitting(false)
        if (err.code === err.PERMISSION_DENIED) {
          setErrorCode('LOCATION_REQUIRED')
          setErrorMsg('')
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
        timeout: 10000,
        maximumAge: 10000,
      },
    )
  }

  const handleReset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setStep('input')
    setEmployeeId('')
    setPin('')
    setResult(null)
    setErrorMsg('')
    setErrorCode('')
    setSubmitting(false)
  }

  if (!isValidQR) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {isNp ? 'अमान्य QR कोड' : 'Invalid QR Code'}
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
          {/* INPUT */}
          {step === 'input' && (
            <div className="overflow-hidden rounded-xl bg-white shadow-md">
              <div className="bg-slate-900 p-6 text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">
                  {isNp ? 'स्मार्ट उपस्थिति' : 'Smart Attendance'}
                </h1>
                <p className="mt-1 text-sm text-white/70">
                  {isNp ? 'कृपया आफ्नो कर्मचारी आईडी हाल्नुहोस्' : 'Enter your Employee ID and PIN'}
                </p>
              </div>
              <div className="space-y-4 p-6">
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-sm text-red-700">{errorMsg}</span>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {isNp ? 'कर्मचारी आईडी' : 'Employee ID'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
                      placeholder={isNp ? 'उदा: 10001' : 'e.g., 10001'}
                      className="w-full rounded-xl border border-gray-300 py-3.5 pl-11 pr-4 text-center text-lg font-medium tracking-wider transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-200"
                      autoFocus
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {isNp ? 'हाजिरी PIN' : 'Attendance PIN'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="pin-input"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                        setErrorMsg('')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="••••"
                      className="w-full rounded-xl border border-gray-300 py-3.5 pl-11 pr-4 text-center text-lg font-medium tracking-widest transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-200"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !employeeId.trim() || pin.length !== 4}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-lg font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clock className="h-5 w-5" />
                  {isNp ? 'उपस्थिति जनाउनुहोस्' : 'Record Attendance'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  {isNp
                    ? 'तपाईंको कर्मचारी आईडी तपाईंको आईडी कार्डमा छ'
                    : 'Your Employee ID is on your ID card'}
                </p>
              </div>
            </div>
          )}

          {/* LOCATING */}
          {step === 'locating' && (
            <div className="rounded-xl bg-white p-10 text-center shadow-md">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <MapPin className="h-10 w-10 animate-pulse text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-gray-700">
                {isNp ? 'स्थान पत्ता लगाउँदै...' : 'Getting your location...'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {isNp ? 'कृपया पर्खनुहोस्' : 'Please wait'}
              </p>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="rounded-xl bg-white p-10 text-center shadow-md">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Loader2 className="h-10 w-10 animate-spin text-slate-700" />
              </div>
              <p className="text-lg font-semibold text-gray-700">
                {isNp ? 'प्रशोधन हुँदैछ...' : 'Processing...'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {isNp ? 'कृपया पर्खनुहोस्' : 'Please wait'}
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && result && (
            <div className="overflow-hidden rounded-xl bg-white shadow-md">
              <div
                className={`p-8 text-center ${
                  result.action === 'CLOCK_IN'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-orange-500 to-red-500'
                }`}
              >
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                  {result.action === 'CLOCK_IN' ? (
                    <LogIn className="h-10 w-10 text-white" />
                  ) : (
                    <LogOutIcon className="h-10 w-10 text-white" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {result.action === 'CLOCK_IN'
                    ? isNp
                      ? 'चेक इन सफल!'
                      : 'Clocked In!'
                    : isNp
                      ? 'चेक आउट सफल!'
                      : 'Clocked Out!'}
                </h2>
                <p className="mt-2 text-lg text-white/90">
                  {isNp ? 'नमस्ते' : 'Hello'}, {result.user.firstName} {result.user.lastName}
                </p>
                <p className="mt-1 text-sm text-white/70">{result.user.employeeId}</p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <span className="text-sm text-gray-500">{isNp ? 'समय' : 'Time'}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {result.action === 'CLOCK_IN'
                      ? new Date(result.record.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : result.record.checkOutTime
                        ? new Date(result.record.checkOutTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                  </span>
                </div>
                {result.action === 'CLOCK_OUT' && result.record.duration && (
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <span className="text-sm text-gray-500">{isNp ? 'अवधि' : 'Duration'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.floor(result.record.duration / 60)}
                      {isNp ? ' घण्टा ' : 'h '}
                      {result.record.duration % 60}
                      {isNp ? ' मिनेट' : 'm'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <span className="text-sm text-gray-500">{isNp ? 'मिति' : 'Date'}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {isNp
                      ? `${toNepaliDigits(result.record.bsDay)} ${BS_MONTHS_NP[result.record.bsMonth - 1]} ${toNepaliDigits(result.record.bsYear)}`
                      : `${result.record.bsDay} ${BS_MONTHS_EN[result.record.bsMonth - 1]} ${result.record.bsYear}`}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isNp ? 'फिर्ता जानुहोस्' : 'Back'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  {isNp ? '८ सेकेन्डमा स्वचालित रिसेट हुन्छ' : 'Auto-resets in 8 seconds'}
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="rounded-xl bg-white p-8 text-center shadow-md">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                {isNp ? 'त्रुटि!' : 'Error!'}
              </h2>
              <p className="mb-6 text-gray-600">
                {errorCode
                  ? t(`scan.error.${errorCode}`, lang)
                  : errorMsg || (isNp ? 'त्रुटि भयो' : 'Something went wrong')}
              </p>
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white transition-all hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
                {isNp ? 'पुन: प्रयास गर्नुहोस्' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      </div>

      <PoweredBy />
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
        </div>
      }
    >
      <ScanPageContent />
    </Suspense>
  )
}
