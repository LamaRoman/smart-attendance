'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'form' | 'loading' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const rules = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'One special character' },
  ];
  const allValid = rules.every((r) => r.test) && password === confirmPassword && confirmPassword.length > 0;

  // If user doesn't need password change, redirect to dashboard
  if (user && !user.mustChangePassword) {
    router.push(user.role === 'SUPER_ADMIN' ? '/super-admin' : user.role === 'ORG_ADMIN' ? '/admin' : user.role === 'ORG_ACCOUNTANT' ? '/accountant' : '/employee');
    return null;
  }

  const handleSubmit = async () => {
    if (!allValid) return;
    setStatus('loading');
    try {
      const res = await api.post('/api/v1/auth/change-initial-password', { newPassword: password });
      if (res.error) {
        setStatus('error');
        setErrorMsg(res.error.message || 'Something went wrong');
        return;
      }
      // Refresh user to get updated mustChangePassword: false
      await refreshUser();
      // Route to appropriate dashboard
      if (user?.role === 'SUPER_ADMIN') router.push('/super-admin');
      else if (user?.role === 'ORG_ADMIN') router.push('/admin');
      else if (user?.role === 'ORG_ACCOUNTANT') router.push('/accountant');
      else router.push('/employee');
    } catch {
      setStatus('error');
      setErrorMsg('Could not connect to server');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Set Your Password</h1>
        <p className="text-slate-500 text-sm mb-8">You need to set a new password before continuing.</p>

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
                onChange={(e) => { setPassword(e.target.value); setStatus('form'); }}
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
                onChange={(e) => { setConfirmPassword(e.target.value); setStatus('form'); }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-1.5">
                {password === confirmPassword
                  ? <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-[11px] text-emerald-600">Passwords match</span></>
                  : <><XCircle className="w-3 h-3 text-red-400" /><span className="text-[11px] text-red-500">Passwords don&apos;t match</span></>}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allValid || status === 'loading'}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Setting Password...</>
            ) : 'Set Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
