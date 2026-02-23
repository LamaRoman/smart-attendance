'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut as LogOutIcon,
  User,
  Loader2,
  ArrowLeft,
  Globe,
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function ScanPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const signature = searchParams.get('signature');

  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('NEPALI');
  const [step, setStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');
  const [result, setResult] = useState<{
    action: string;
    message: string;
    user: { firstName: string; lastName: string; employeeId: string };
    record: { checkInTime: string; checkOutTime?: string; duration?: number };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isNp = lang === 'NEPALI';
  const isValidQR = token && signature;

  const handleSubmit = async () => {
    if (!employeeId.trim()) {
      setErrorMsg(isNp ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€ à¤†à¤ˆà¤¡à¥€ à¤¹à¤¾à¤²à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Please enter your Employee ID');
      return;
    }
    if (!pin.trim() || pin.length !== 4) {
      setErrorMsg(isNp ? 'कृपया ४ अंकको PIN हाल्नुहोस्' : 'Please enter your 4-digit PIN');
      return;
    }
    if (!isValidQR) {
      setErrorMsg(isNp ? 'à¤…à¤®à¤¾à¤¨à¥à¤¯ QR à¤•à¥‹à¤¡' : 'Invalid QR code');
      return;
    }

    setStep('processing');
    setErrorMsg('');

    try {
      const qrPayload = JSON.stringify({ token, signature });
      const response = await fetch(`${API_URL}/api/attendance/scan-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload, employeeId: employeeId.trim().toUpperCase(), pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStep('error');
        setErrorMsg(data.error?.message || (isNp ? 'à¤¤à¥à¤°à¥à¤Ÿà¤¿ à¤­à¤¯à¥‹' : 'Something went wrong'));
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
      setErrorMsg(isNp ? 'à¤¸à¤°à¥à¤­à¤°à¤¸à¤à¤— à¤œà¤¡à¤¾à¤¨ à¤¹à¥à¤¨ à¤¸à¤•à¥‡à¤¨' : 'Could not connect to server');
    }
  };

  const handleReset = () => {
    setStep('input');
    setEmployeeId('');
    setResult(null);
    setErrorMsg('');
  };

  if (!isValidQR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isNp ? 'à¤…à¤®à¤¾à¤¨à¥à¤¯ QR à¤•à¥‹à¤¡' : 'Invalid QR Code'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isNp ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤•à¤¾à¤°à¥à¤¯à¤¾à¤²à¤¯à¤®à¤¾ à¤°à¤¹à¥‡à¤•à¥‹ QR à¤•à¥‹à¤¡ à¤¸à¥à¤•à¥à¤¯à¤¾à¤¨ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥à¥¤' : 'Please scan the QR code at your office.'}
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
          {isNp ? 'EN' : 'à¤¨à¥‡'}
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
                  {isNp ? 'à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤à¤¿' : 'Smart Attendance'}
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  {isNp ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤†à¤«à¥à¤¨à¥‹ à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€ à¤†à¤ˆà¤¡à¥€ à¤¹à¤¾à¤²à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Enter your Employee ID'}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{errorMsg}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isNp ? 'à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€ à¤†à¤ˆà¤¡à¥€' : 'Employee ID'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder={isNp ? 'à¤‰à¤¦à¤¾: EMP-10001' : 'e.g., EMP-10001'}
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
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-transparent transition-all text-center tracking-widest"
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                >
                  <Clock className="w-5 h-5" />
                  {isNp ? 'à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤œà¤¨à¤¾à¤‰à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Record Attendance'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {isNp ? 'à¤¤à¤ªà¤¾à¤ˆà¤‚à¤•à¥‹ à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€ à¤†à¤ˆà¤¡à¥€ à¤¤à¤ªà¤¾à¤ˆà¤‚à¤•à¥‹ à¤†à¤ˆà¤¡à¥€ à¤•à¤¾à¤°à¥à¤¡à¤®à¤¾ à¤›' : 'Your Employee ID is on your ID card'}
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
                {isNp ? 'à¤ªà¥à¤°à¤¶à¥‹à¤§à¤¨ à¤¹à¥à¤à¤¦à¥ˆà¤›...' : 'Processing...'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isNp ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤°à¥à¤–à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Please wait'}
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
                    ? isNp ? 'à¤šà¥‡à¤• à¤‡à¤¨ à¤¸à¤«à¤²!' : 'Clocked In!'
                    : isNp ? 'à¤šà¥‡à¤• à¤†à¤‰à¤Ÿ à¤¸à¤«à¤²!' : 'Clocked Out!'}
                </h2>
                <p className="text-white/90 text-lg mt-2">
                  {isNp ? 'à¤¨à¤®à¤¸à¥à¤¤à¥‡' : 'Hello'}, {result.user.firstName} {result.user.lastName}
                </p>
                <p className="text-white/70 text-sm mt-1">{result.user.employeeId}</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">{isNp ? 'à¤¸à¤®à¤¯' : 'Time'}</span>
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
                    <span className="text-sm text-gray-500">{isNp ? 'à¤…à¤µà¤§à¤¿' : 'Duration'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.floor(result.record.duration / 60)}{isNp ? ' à¤˜à¤£à¥à¤Ÿà¤¾ ' : 'h '}{result.record.duration % 60}{isNp ? ' à¤®à¤¿à¤¨à¥‡à¤Ÿ' : 'm'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">{isNp ? 'à¤®à¤¿à¤¤à¤¿' : 'Date'}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date().toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isNp ? 'à¤«à¤¿à¤°à¥à¤¤à¤¾ à¤œà¤¾à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Back'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {isNp ? 'à¥® à¤¸à¥‡à¤•à¥‡à¤¨à¥à¤¡à¤®à¤¾ à¤¸à¥à¤µà¤šà¤¾à¤²à¤¿à¤¤ à¤°à¤¿à¤¸à¥‡à¤Ÿ à¤¹à¥à¤¨à¥à¤›' : 'Auto-resets in 8 seconds'}
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
                {isNp ? 'à¤¤à¥à¤°à¥à¤Ÿà¤¿!' : 'Error!'}
              </h2>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                {isNp ? 'à¤ªà¥à¤¨: à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥' : 'Try Again'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
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
