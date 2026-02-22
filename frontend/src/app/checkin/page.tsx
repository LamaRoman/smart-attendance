'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function CheckinPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  const [employeeId, setEmployeeId] = useState('');
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('NEPALI');
  const [step, setStep] = useState<'input' | 'locating' | 'processing' | 'success' | 'error'>('input');
  const [orgInfo, setOrgInfo] = useState<{ name: string; attendanceMode: string; geofenceEnabled: boolean } | null>(null);
  const [result, setResult] = useState<{
    action: string;
    message: string;
    user: { firstName: string; lastName: string; employeeId: string };
    record: { checkInTime: string; checkOutTime?: string; duration?: number };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const isNp = lang === 'NEPALI';

  // Fetch org info
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(API_URL + '/api/attendance/org-mode/' + orgId);
        const data = await res.json();
        if (data.data) setOrgInfo(data.data);
      } catch {}
      setLoading(false);
    })();
  }, [orgId]);

  const handleSubmit = async () => {
    if (!employeeId.trim()) {
      setErrorMsg(isNp ? 'कृपया कर्मचारी आईडी हाल्नुहोस्' : 'Please enter your Employee ID');
      return;
    }
    setStep('locating');
    setErrorMsg('');

    // Get GPS location
    if (!navigator.geolocation) {
      setStep('error');
      setErrorMsg(isNp ? 'तपाईंको ब्राउजरले GPS सपोर्ट गर्दैन' : 'Your browser does not support GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStep('processing');
        try {
          const response = await fetch(API_URL + '/api/attendance/mobile-checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: employeeId.trim().toUpperCase(),
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            setStep('error');
            setErrorMsg(data.error?.message || (isNp ? 'त्रुटि भयो' : 'Something went wrong'));
            return;
          }
          setResult(data.data);
          setStep('success');
          setTimeout(() => {
            setStep('input');
            setEmployeeId('');
            setResult(null);
          }, 8000);
        } catch (err) {
          setStep('error');
          setErrorMsg(isNp ? 'सर्भरसँग जडान हुन सकेन' : 'Could not connect to server');
        }
      },
      (err) => {
        setStep('error');
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg(isNp ? 'कृपया GPS अनुमति दिनुहोस्' : 'Please allow location access to check in');
        } else {
          setErrorMsg(isNp ? 'स्थान प्राप्त गर्न सकिएन' : 'Could not get your location');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleReset = () => {
    setStep('input');
    setEmployeeId('');
    setResult(null);
    setErrorMsg('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!orgId || !orgInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isNp ? 'अमान्य लिङ्क' : 'Invalid Link'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isNp ? 'कृपया सही चेक-इन लिङ्क प्रयोग गर्नुहोस्।' : 'Please use the correct check-in link from your organization.'}
          </p>
        </div>
      </div>
    );
  }

  if (orgInfo.attendanceMode === 'QR_ONLY') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isNp ? 'मोबाइल चेक-इन उपलब्ध छैन' : 'Mobile Check-in Not Available'}
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
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg mb-4">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNp ? 'मोबाइल चेक-इन' : 'Mobile Check-in'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{orgInfo.name}</p>
          </div>

          {/* Input Step */}
          {step === 'input' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isNp ? 'कर्मचारी आईडी' : 'Employee ID'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => { setEmployeeId(e.target.value.toUpperCase()); setErrorMsg(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder={isNp ? 'EMP001' : 'EMP001'}
                    className="w-full pl-11 pr-4 py-3 text-lg font-mono tracking-wider border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 transition-colors text-center uppercase"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm text-red-600">{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!employeeId.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl font-semibold text-base hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                {isNp ? 'चेक इन / आउट' : 'Check In / Out'}
              </button>

              <p className="text-center text-xs text-slate-400">
                <MapPin className="w-3 h-3 inline mr-1" />
                {isNp ? 'GPS स्थान प्रयोग गरिनेछ' : 'Your GPS location will be verified'}
              </p>
            </div>
          )}

          {/* Locating Step */}
          {step === 'locating' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <MapPin className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                {isNp ? 'स्थान पत्ता लगाउँदै...' : 'Getting your location...'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp ? 'कृपया प्रतीक्षा गर्नुहोस्' : 'Please wait'}
              </p>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900">
                {isNp ? 'प्रशोधन हुँदैछ...' : 'Processing...'}
              </h2>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && result && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center">
              <div className={"inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 " + (result.action === 'CLOCK_IN' ? "bg-emerald-100" : "bg-blue-100")}>
                {result.action === 'CLOCK_IN'
                  ? <LogIn className="w-10 h-10 text-emerald-600" />
                  : <LogOutIcon className="w-10 h-10 text-blue-600" />}
              </div>
              <h2 className={"text-xl font-bold mb-1 " + (result.action === 'CLOCK_IN' ? "text-emerald-700" : "text-blue-700")}>
                {result.action === 'CLOCK_IN'
                  ? (isNp ? 'चेक इन सफल!' : 'Checked In!')
                  : (isNp ? 'चेक आउट सफल!' : 'Checked Out!')}
              </h2>
              <p className="text-base font-semibold text-slate-900 mb-1">
                {result.user.firstName} {result.user.lastName}
              </p>
              <p className="text-sm text-slate-500 mb-1">{result.user.employeeId}</p>
              <p className="text-sm text-slate-500">
                {result.action === 'CLOCK_IN'
                  ? new Date(result.record.checkInTime).toLocaleTimeString()
                  : new Date(result.record.checkOutTime!).toLocaleTimeString()}
              </p>
              {result.record.duration && (
                <p className="text-sm text-slate-400 mt-1">
                  {isNp ? 'अवधि' : 'Duration'}: {Math.floor(result.record.duration / 60)}h {result.record.duration % 60}m
                </p>
              )}
              <button onClick={handleReset} className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline">
                {isNp ? 'फेरि चेक गर्नुहोस्' : 'Check again'}
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-red-700 mb-2">
                {isNp ? 'त्रुटि' : 'Error'}
              </h2>
              <p className="text-sm text-slate-600 mb-4">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                {isNp ? 'पुनः प्रयास' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      </div>
      <PoweredBy />
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <CheckinPageContent />
    </Suspense>
  );
}
