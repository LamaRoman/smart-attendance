'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'form' | 'loading' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState('')

  const rules = [
    { test: password.length >= 8, label: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { test: /[a-z]/.test(password), label: 'One lowercase letter' },
    { test: /[0-9]/.test(password), label: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'One special character' },
  ]
  const allValid =
    rules.every((r) => r.test) && password === confirmPassword && confirmPassword.length > 0

  // If user doesn't need password change, redirect to dashboard
  if (user && !user.mustChangePassword) {
    router.push(
      user.role === 'SUPER_ADMIN'
        ? '/super-admin'
        : user.role === 'ORG_ADMIN'
          ? '/admin'
          : user.role === 'ORG_ACCOUNTANT'
            ? '/accountant'
            : '/employee',
    )
    return null
  }

  const handleSubmit = async () => {
    if (!allValid) return
    setStatus('loading')
    try {
      const res = await api.post('/api/v1/auth/change-initial-password', { newPassword: password })
      if (res.error) {
        setStatus('error')
        setErrorMsg(res.error.message || 'Something went wrong')
        return
      }
      // Refresh user to get updated mustChangePassword: false
      await refreshUser()
      // Route to appropriate dashboard
      if (user?.role === 'SUPER_ADMIN') router.push('/super-admin')
      else if (user?.role === 'ORG_ADMIN') router.push('/admin')
      else if (user?.role === 'ORG_ACCOUNTANT') router.push('/accountant')
      else router.push('/employee')
    } catch {
      setStatus('error')
      setErrorMsg('Could not connect to server')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Set Your Password</h1>
        <p className="mb-8 text-sm text-slate-500">
          You need to set a new password before continuing.
        </p>

        {status === 'error' && (
          <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 p-3">
            <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span className="text-sm text-red-600">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setStatus('form')
                }}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                {rules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {rule.test ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-300" />
                    )}
                    <span
                      className={`text-[11px] ${rule.test ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setStatus('form')
                }}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-1.5">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span className="text-[11px] text-emerald-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-400" />
                    <span className="text-[11px] text-red-500">Passwords don&apos;t match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allValid || status === 'loading'}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
                Setting Password...
              </>
            ) : (
              'Set Password'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
