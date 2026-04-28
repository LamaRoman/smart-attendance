'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import {
  QrCode,
  Printer,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Shield,
  Trash2,
  Copy,
  MapPin,
  Clock,
} from 'lucide-react'

interface QRData {
  qrCode: {
    id: string
    token: string
    scanCount: number
    expiresAt: string | null
    createdAt: string
  }
  scanUrl: string
  qrImage: string
  qrImageLarge?: string
  isStatic?: boolean
  isExisting?: boolean
}

function useCountdown(expiresAt: string | null, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState('')
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('')
      return
    }

    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:00:00')
        onExpireRef.current()
        return
      }
      const totalSeconds = Math.floor(diff / 1000)
      const d = Math.floor(totalSeconds / 86400)
      const h = Math.floor((totalSeconds % 86400) / 3600)
      const m = Math.floor((totalSeconds % 3600) / 60)
      const s = totalSeconds % 60
      if (d > 0) {
        setTimeLeft(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`)
      } else {
        setTimeLeft(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        )
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return timeLeft
}

export default function AdminQRPage() {
  const { user, isLoading, language, features } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const [qrData, setQrData] = useState<QRData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') loadQR()
  }, [user])

  const loadQR = async () => {
    const res = await api.get('/api/v1/qr/active')
    if (res.data) setQrData(res.data as QRData)
  }

  // Auto-refresh rotating QR when it expires
  const handleExpire = useCallback(async () => {
    if (!qrData || qrData.qrCode.expiresAt === null) return
    setGenerating(true)
    const res = await api.post('/api/v1/qr/generate')
    if (res.data) {
      setQrData(res.data as QRData)
      setSuccess(isNp ? 'QR कोड स्वतः नवीकरण भयो' : 'QR code auto-renewed')
      setTimeout(() => setSuccess(''), 3000)
    }
    setGenerating(false)
  }, [qrData, isNp])

  const isStatic = qrData?.isStatic ?? !qrData?.qrCode?.expiresAt
  // CHANGED: always pass expiresAt regardless of isStatic, so both static and rotating show a timer
  const timeLeft = useCountdown(qrData?.qrCode?.expiresAt ?? null, handleExpire)

  // CHANGED: handle both HH:MM:SS and Xd XXh XXm formats for colour
  const countdownColor = () => {
    if (!timeLeft) return ''
    const dMatch = timeLeft.match(/^(\d+)d/)
    const hMatch = timeLeft.match(/(\d+)h/)
    const totalHours = dMatch
      ? parseInt(dMatch[1]) * 24 + (hMatch ? parseInt(hMatch[1]) : 0)
      : parseInt(timeLeft.split(':')[0])
    if (totalHours < 1) return 'text-rose-600'
    if (totalHours < 3) return 'text-amber-600'
    return 'text-emerald-600'
  }

  const generateStaticQR = async () => {
    setGenerating(true)
    setError('')
    const res = await api.post('/api/v1/qr/generate-static')
    if (res.error) {
      setError(res.error.message)
    } else {
      setQrData(res.data as QRData)
      setSuccess(isNp ? 'स्थिर QR कोड सिर्जना गरियो' : 'Static QR code generated')
      setTimeout(() => setSuccess(''), 3000)
    }
    setGenerating(false)
  }

  const regenerateStaticQR = async () => {
    if (
      !confirm(
        isNp
          ? 'पुरानो QR कोड रद्द हुनेछ। नयाँ बनाउने?'
          : 'Old QR will be revoked. Generate new one?',
      )
    )
      return
    setGenerating(true)
    setError('')
    const res = await api.post('/api/v1/qr/regenerate-static')
    if (res.error) {
      setError(res.error.message)
    } else {
      setQrData(res.data as QRData)
      setSuccess(isNp ? 'नयाँ QR कोड सिर्जना गरियो' : 'New QR code generated')
      setTimeout(() => setSuccess(''), 3000)
    }
    setGenerating(false)
  }

  const generateRotatingQR = async () => {
    setGenerating(true)
    setError('')
    const res = await api.post('/api/v1/qr/generate')
    if (res.error) {
      setError(res.error.message)
    } else {
      setQrData(res.data as QRData)
      setSuccess(isNp ? 'QR कोड सिर्जना गरियो (२४ घण्टा)' : 'QR code generated (24 hours)')
      setTimeout(() => setSuccess(''), 3000)
    }
    setGenerating(false)
  }

  const revokeQR = async () => {
    if (!confirm(isNp ? 'सबै सक्रिय QR कोड रद्द गर्ने?' : 'Revoke all active QR codes?')) return
    const res = await api.post('/api/v1/qr/revoke')
    if (res.error) {
      setError(res.error.message)
    } else {
      setQrData(null)
      setSuccess(isNp ? 'QR कोड रद्द गरियो' : 'QR codes revoked')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const printQR = () => {
    if (!qrData?.qrImage) return
    const w = window.open('', '_blank')
    if (!w) return

    const orgName = user?.organization?.name || 'Smart Attendance'
    const qrSrc = qrData.qrImageLarge || qrData.qrImage

    const QR_SRC_ALLOWED = /^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+$/
    if (!QR_SRC_ALLOWED.test(qrSrc)) {
      w.close()
      setError(isNp ? 'QR कोड छवि मान्य छैन' : 'QR image is not in the expected format')
      return
    }

    const doc = w.document
    doc.open()
    doc.write('<!DOCTYPE html><html><head><title>QR Code</title></head><body></body></html>')
    doc.close()

    const style = doc.createElement('style')
    style.textContent =
      'body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;margin:0;background:white}' +
      'h1{margin-bottom:6px;font-size:26px;font-weight:500;color:#0f172a}' +
      'h2{color:#475569;margin-bottom:28px;font-size:17px;font-weight:normal}' +
      'img{max-width:420px;border-radius:14px}' +
      'p{color:#64748b;margin-top:28px;font-size:14px}'
    doc.head.appendChild(style)

    const h1 = doc.createElement('h1')
    h1.textContent = orgName
    doc.body.appendChild(h1)

    const h2 = doc.createElement('h2')
    h2.textContent = isNp ? 'उपस्थिति जनाउन स्क्यान गर्नुहोस्' : 'Scan to record attendance'
    doc.body.appendChild(h2)

    const img = doc.createElement('img')
    img.src = qrSrc
    img.alt = 'QR Code'
    doc.body.appendChild(img)

    const p = doc.createElement('p')
    p.textContent = isNp ? 'स्मार्ट उपस्थिति प्रणाली' : 'Smart Attendance System'
    doc.body.appendChild(p)

    w.print()
  }

  const downloadQR = () => {
    if (!qrData?.qrImage) return
    const link = document.createElement('a')
    link.download = 'attendance-qr.png'
    link.href = qrData.qrImageLarge || qrData.qrImage
    link.click()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user) return null

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isNp ? 'QR कोड व्यवस्थापन' : 'QR code management'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isNp
                ? 'कर्मचारीहरूले स्क्यान गरी उपस्थिति जनाउन सक्छन्'
                : 'Employees scan to record attendance'}
            </p>
          </div>
          {qrData && (
            <div className="flex items-center gap-2">
              <button
                onClick={printQR}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" />
                {isNp ? 'प्रिन्ट' : 'Print'}
              </button>
              <button
                onClick={downloadQR}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                {isNp ? 'डाउनलोड' : 'Download'}
              </button>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-medium text-rose-700">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* QR Display */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {qrData?.qrImage ? (
            <div className="flex flex-col items-center px-6 pb-6 pt-8">
              {/* QR Code */}
              <div className="relative mb-5">
                <div className="absolute inset-0 -m-1.5 rounded-xl bg-slate-50" />
                <div className="relative rounded-xl border border-slate-200 bg-white p-5">
                  <img src={qrData.qrImage} alt="QR Code" className="h-64 w-64" />
                </div>
              </div>

              {/* Badge */}
              <div
                className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isStatic ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-blue-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isStatic ? 'bg-slate-500' : 'bg-blue-500'}`}
                />
                {isStatic
                  ? isNp
                    ? 'स्थिर QR'
                    : 'Static QR'
                  : isNp
                    ? 'अस्थायी QR (२४ घण्टा)'
                    : 'Temporary QR (24h)'}
              </div>

              {/* REMOVED: separate countdown timer block — timer now lives in the Expires stat card */}

              {/* Stats */}
              <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {isNp ? 'स्क्यान' : 'Scans'}
                  </p>
                  <p className="text-xl font-semibold tracking-tight text-slate-900">
                    {qrData.qrCode.scanCount}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {isNp ? 'सिर्जना' : 'Created'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(qrData.qrCode.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {/* CHANGED: Expires card now shows live countdown timer for both static and rotating */}
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {isNp ? 'समाप्ति' : 'Expires'}
                  </p>
                  <p className={`font-mono text-sm font-medium tabular-nums ${countdownColor()}`}>
                    {timeLeft || (isNp ? 'कहिल्यै' : 'Never')}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {isNp ? 'प्रकार' : 'Type'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {isStatic ? (isNp ? 'स्थिर' : 'Static') : isNp ? 'अस्थायी' : 'Temp'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                <QrCode className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold text-slate-900">
                {isNp ? 'कुनै सक्रिय QR कोड छैन' : 'No active QR code'}
              </h3>
              <p className="mb-6 max-w-sm text-sm text-slate-500">
                {isNp
                  ? 'उपस्थिति ट्र्याकिङ सुरु गर्न तलबाट QR कोड बनाउनुहोस्'
                  : 'Generate a QR code below to start tracking attendance'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {features.staticQR && (
            <button
              onClick={qrData && isStatic ? regenerateStaticQR : generateStaticQR}
              disabled={generating}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50/50 disabled:opacity-50"
            >
              <div className="rounded-lg bg-slate-100 p-2.5 transition-colors group-hover:bg-slate-100">
                <QrCode className="h-5 w-5 text-slate-900" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">
                  {qrData && isStatic
                    ? isNp
                      ? 'नयाँ स्थिर QR'
                      : 'Regenerate static'
                    : isNp
                      ? 'स्थिर QR'
                      : 'Static QR'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {isNp ? 'प्रिन्ट गरी टाँस्नुहोस्' : 'Print & stick'}
                </div>
              </div>
            </button>
          )}

          {features.rotatingQR && (
            <button
              onClick={generateRotatingQR}
              disabled={generating}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50/50 disabled:opacity-50"
            >
              <div className="rounded-lg bg-blue-50 p-2.5 transition-colors group-hover:bg-blue-100">
                <RefreshCw
                  className={`h-5 w-5 text-blue-600 ${generating ? 'animate-spin' : ''}`}
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">
                  {isNp ? 'अस्थायी QR' : 'Rotating QR'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {isNp ? '२४ घण्टा मान्य' : 'Valid 24h'}
                </div>
              </div>
            </button>
          )}

          {qrData && (
            <button
              onClick={revokeQR}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-rose-200 hover:bg-rose-50/30"
            >
              <div className="rounded-lg bg-rose-50 p-2.5 transition-colors group-hover:bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-rose-700 group-hover:text-rose-800">
                  {isNp ? 'QR रद्द' : 'Revoke QR'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {isNp ? 'सक्रिय QR रद्द' : 'Revoke active'}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            {isNp ? 'कसरी प्रयोग गर्ने?' : 'How it works'}
          </h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200">
                <span className="text-xs font-semibold text-slate-700">1</span>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium text-slate-900">
                  {isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'QR कोड प्रिन्ट गरी टाँस्नुहोस्' : 'Print and display QR code'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200">
                <span className="text-xs font-semibold text-slate-700">2</span>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium text-slate-900">
                  {isNp ? 'स्क्यान' : 'Scan'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'कर्मचारीले फोनले स्क्यान गर्छन्' : 'Employees scan with phone'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200">
                <span className="text-xs font-semibold text-slate-700">3</span>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium text-slate-900">
                  {isNp ? 'उपस्थिति' : 'Attendance'}
                </p>
                <p className="text-xs text-slate-500">
                  {isNp ? 'आईडी हालेर चेक इन/आउट' : 'Enter ID to clock in/out'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Check-in Link */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
              <MapPin className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isNp ? 'मोबाइल चेक-इन' : 'Mobile Check-in'}
              </h3>
              <p className="text-xs text-slate-500">
                {isNp ? 'QR बिना GPS बाट चेक इन' : 'GPS-based check-in without QR'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={
                typeof window !== 'undefined'
                  ? window.location.origin +
                    (user?.organization?.slug
                      ? '/c/' + user.organization.slug
                      : '/checkin?org=' + (user?.organizationId || ''))
                  : ''
              }
              className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
            />
            <button
              onClick={() => {
                const url =
                  window.location.origin +
                  (user?.organization?.slug
                    ? '/c/' + user.organization.slug
                    : '/checkin?org=' + (user?.organizationId || ''))
                navigator.clipboard.writeText(url)
                setSuccess(isNp ? 'लिङ्क कपी भयो' : 'Link copied')
                setTimeout(() => setSuccess(''), 3000)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" />
              {isNp ? 'कपी' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {isNp
              ? 'यो लिङ्क कर्मचारीलाई शेयर गर्नुहोस्। जियोफेन्सिङ सक्रिय हुनपर्छ।'
              : 'Share this link with employees. Geofencing must be enabled.'}
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}