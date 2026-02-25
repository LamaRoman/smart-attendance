'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const rules = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
  ];
  const allValid = rules.every((r) => r.test) && password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!allValid) return;
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error?.message || 'Something went wrong');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Could not connect to server');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-sm text-slate-500 mb-6">This password reset link is invalid or has expired.</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Password Reset!</h1>
          <p className="text-sm text-slate-500 mb-6">Your password has been changed successfully. You can now sign in.</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => router.push('/login')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Set new password</h1>
        <p className="text-slate-500 text-sm mb-8">Choose a strong password for your account.</p>

        {status === 'error' && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-600 text-sm">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                {rules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {rule.test
                      ? <CheckCircle className="w-3 h-3 text-emerald-500" />
                      : <XCircle className="w-3 h-3 text-slate-300" />}
                    <span className={`text-[11px] ${rule.test ? 'text-emerald-600' : 'text-slate-400'}`}>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-1.5">
                {password === confirmPassword
                  ? <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-[11px] text-emerald-600">Passwords match</span></>
                  : <><XCircle className="w-3 h-3 text-red-400" /><span className="text-[11px] text-red-500">Passwords don't match</span></>}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allValid || status === 'loading'}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Resetting...</>
            ) : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-800" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}