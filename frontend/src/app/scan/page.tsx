'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';
import { BS_MONTHS_EN, BS_MONTHS_NP, toNepaliDigits } from '@/components/BSDatePicker';
import { t } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function ScanPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const signature = searchParams.get('signature');

  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('ENGLISH');
  const [step, setStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');
  const [result, setResult] = useState<{
    action: string;
    message: string;
    user: { firstName: string; lastName: string; employeeId: string };
    record: { checkInTime: string; checkOutTime?: string; duration?: number; bsYear: number; bsMonth: number; bsDay: number };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS state — for UI display
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ready' | 'denied'>('loading');

  // GPS refs — for reading latest values inside async callbacks (avoids stale closure)
  const locationRef = useRef<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const locationStatusRef = useRef<'loading' | 'ready' | 'denied'>('loading');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          locationRef.current = loc;
          locationStatusRef.current = 'ready';
          setLocation(loc);
          setLocationStatus('ready');
        },
        () => {
          locationRef.current = null;
          locationStatusRef.current = 'denied';
          setLocation(null);
          setLocationStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      locationStatusRef.current = 'denied';
      setLocationStatus('denied');
    }
  }, []);

  const isNp = lang === 'NEPALI';
  const isValidQR = token && signature;

  const handleSubmit = async () => {
    if (submitting) return;

    if (!employeeId.trim()) {
      setErrorMsg(isNp ? 'कृपया कर्मचारी आईडी हाल्नुहोस्' : 'Please enter your Employee ID');
      return;
    }
    if (!pin.trim() || pin.length !== 4) {
      setErrorMsg(isNp ? 'कृपया ४ अंकको PIN हाल्नुहोस्' : 'Please enter your 4-digit PIN');
      return;
    }
    if (!isValidQR) {
      setErrorMsg(isNp ? 'अमान्य QR कोड' : 'Invalid QR code');
      return;
    }

    setSubmitting(true);
    setStep('processing');
    setErrorMsg('');
    setErrorCode('');

    try {
      // If GPS is still loading, wait up to 10 seconds for it to resolve
      let resolvedLocation = locationRef.current;
      if (locationStatusRef.current === 'loading') {
        resolvedLocation = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 10000);
          const interval = setInterval(() => {
            if (locationStatusRef.current !== 'loading') {
              clearTimeout(timeout);
              clearInterval(interval);
              resolve(locationRef.current);
            }
          }, 200);
        });
      }

      const qrPayload = JSON.stringify({ token, signature });
      const response = await fetch(`${API_URL}/api/attendance/scan-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload,
          employeeId: employeeId.trim().toUpperCase(),
          pin,
          ...(resolvedLocation ? {
            latitude: resolvedLocation.latitude,
            longitude: resolvedLocation.longitude,
            accuracy: resolvedLocation.accuracy,
          } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStep('error');
        setErrorCode(data.error?.code || '');
        setErrorMsg(data.error?.message || '');
        setSubmitting(false);
        return;
      }

      setResult(data.data);
      setStep('success');
      setPin('');

      timeoutRef.current = setTimeout(() => {
        setStep('input');
        setEmployeeId('');
        setPin('');
        setResult(null);
        setSubmitting(false);
      }, 8000);
    } catch (err) {
      setStep('error');
      setErrorMsg(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server');
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStep('input');
    setEmployeeId('');
    setPin('');
    setResult(null);
    setErrorMsg('');
    setErrorCode('');
    setSubmitting(false);
  };

  if (!isValidQR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isNp ? 'अमान्य QR कोड' : 'Invalid QR Code'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isNp ? 'कृपया कार्यालयमा रहेको QR कोड स्क्यान गर्नुहोस्।' : 'Please scan the QR code at your office.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLang(isNp ? 'ENGLISH' : 'NEPALI')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-gray-200 rounded-lg hover:bg-white hover:shadow-md transition-all text-xs font-medium text-gray-600"
        >
          <Globe className="w-3.5 h-3.5" />
          {isNp ? 'EN' : 'ने'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          {/* INPUT */}
          {step === 'input' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-slate-900 p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-xl mb-3">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">
                  {isNp ? 'स्मार्ट उपस्थिति' : 'Smart Attendance'}
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  {isNp ? 'कृपया आफ्नो कर्मचारी आईडी हाल्नुहोस्' : 'Enter your Employee ID and PIN'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{errorMsg}</span>
                  </div>
                )}

                {/* GPS Status Indicator */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  locationStatus === 'ready'
                    ? 'bg-green-50 text-green-700'
                    : locationStatus === 'denied'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-slate-50 text-slate-500'
                }`}>
                  {locationStatus === 'loading' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  )}
                  {locationStatus === 'ready' && (
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  {locationStatus === 'denied' && (
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>
                    {locationStatus === 'loading' && t('scan.gps.loading', lang)}
                    {locationStatus === 'ready' && t('scan.gps.ready', lang)}
                    {locationStatus === 'denied' && t('scan.gps.denied', lang)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isNp ? 'कर्मचारी आईडी' : 'Employee ID'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => {
                        setEmployeeId(e.target.value.trim());
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && document.getElementById('pin-input')?.focus()}
                      placeholder={isNp ? 'उदा: 10001' : 'e.g., 10001'}
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-transparent transition-all text-center tracking-wider"
                      autoFocus
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isNp ? 'हाजिरी PIN' : 'Attendance PIN'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="pin-input"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="••••"
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-transparent transition-all text-center tracking-widest"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !employeeId.trim() || pin.length !== 4}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-5 h-5" />
                  {isNp ? 'उपस्थिति जनाउनुहोस्' : 'Record Attendance'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {isNp ? 'तपाईंको कर्मचारी आईडी तपाईंको आईडी कार्डमा छ' : 'Your Employee ID is on your ID card'}
                </p>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="bg-white rounded-xl shadow-md p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                <Loader2 className="w-10 h-10 text-slate-700 animate-spin" />
              </div>
              <p className="text-lg font-semibold text-gray-700">
                {isNp ? 'प्रशोधन हुँदैछ...' : 'Processing...'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isNp ? 'कृपया पर्खनुहोस्' : 'Please wait'}
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && result && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className={`p-8 text-center ${
                result.action === 'CLOCK_IN'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-4">
                  {result.action === 'CLOCK_IN'
                    ? <LogIn className="w-10 h-10 text-white" />
                    : <LogOutIcon className="w-10 h-10 text-white" />}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {result.action === 'CLOCK_IN'
                    ? isNp ? 'चेक इन सफल!' : 'Clocked In!'
                    : isNp ? 'चेक आउट सफल!' : 'Clocked Out!'}
                </h2>
                <p className="text-white/90 text-lg mt-2">
                  {isNp ? 'नमस्ते' : 'Hello'}, {result.user.firstName} {result.user.lastName}
                </p>
                <p className="text-white/70 text-sm mt-1">{result.user.employeeId}</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">{isNp ? 'समय' : 'Time'}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {result.action === 'CLOCK_IN'
                      ? new Date(result.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : result.record.checkOutTime
                        ? new Date(result.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                  </span>
                </div>
                {result.action === 'CLOCK_OUT' && result.record.duration && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">{isNp ? 'अवधि' : 'Duration'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.floor(result.record.duration / 60)}{isNp ? ' घण्टा ' : 'h '}{result.record.duration % 60}{isNp ? ' मिनेट' : 'm'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">{isNp ? 'मिति' : 'Date'}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {isNp
                      ? `${toNepaliDigits(result.record.bsDay)} ${BS_MONTHS_NP[result.record.bsMonth - 1]} ${toNepaliDigits(result.record.bsYear)}`
                      : `${result.record.bsDay} ${BS_MONTHS_EN[result.record.bsMonth - 1]} ${result.record.bsYear}`
                    }
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isNp ? 'फिर्ता जानुहोस्' : 'Back'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {isNp ? '८ सेकेन्डमा स्वचालित रिसेट हुन्छ' : 'Auto-resets in 8 seconds'}
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isNp ? 'त्रुटि!' : 'Error!'}
              </h2>
              <p className="text-gray-600 mb-6">
                {errorCode
                  ? t(`scan.error.${errorCode}`, lang)
                  : (errorMsg || (isNp ? 'त्रुटि भयो' : 'Something went wrong'))}
              </p>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                {isNp ? 'पुन: प्रयास गर्नुहोस्' : 'Try Again'}
              </button>
            </div>
          )}

        </div>
      </div>

      <PoweredBy />
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}