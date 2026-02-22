'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Mail, Lock, LogIn, Globe, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'NEPALI' | 'ENGLISH'>('NEPALI');
  const { login } = useAuth();
  const isNp = lang === 'NEPALI';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : isNp ? 'लग इन असफल भयो' : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-slate-950 font-bold text-lg">S</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Smart Attendance</span>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {isNp ? 'आफ्नो टिमको उपस्थिति सजिलै व्यवस्थापन गर्नुहोस्' : "Manage your team's attendance effortlessly"}
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            {isNp ? 'QR स्क्यान, बिदा व्यवस्थापन, तलब प्रशोधन — सबै एकै ठाउँमा।' : 'QR scanning, leave management, payroll processing — all in one place.'}
          </p>
        </div>
        <div>
          <PoweredBy />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Language toggle */}
        <div className="flex justify-between items-center p-6 lg:px-12">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">Smart Attendance</span>
          </div>
          <button
            onClick={() => setLang(isNp ? 'ENGLISH' : 'NEPALI')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors ml-auto"
          >
            <Globe className="w-3.5 h-3.5" />
            {isNp ? 'English' : 'नेपाली'}
          </button>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {isNp ? 'लग इन गर्नुहोस्' : 'Sign in'}
            </h1>
            <p className="text-slate-500 text-sm mb-8">
              {isNp ? 'आफ्नो खातामा जानको लागि इमेल र पासवर्ड हाल्नुहोस्' : 'Enter your credentials to access your account'}
            </p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isNp ? 'इमेल' : 'Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isNp ? 'तपाईंको इमेल' : 'name@company.com'}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isNp ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {isNp ? 'लग इन हुँदैछ...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {isNp ? 'लग इन गर्नुहोस्' : 'Sign in'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                {isNp ? 'डेमो प्रशासक:' : 'Demo Admin:'} orgadmin@democompany.com
              </p>
              <p className="text-xs text-slate-400 text-center mt-0.5">
                {isNp ? 'डेमो कर्मचारी:' : 'Demo Employee:'} sita@democompany.com
              </p>
            </div>
          </div>
        </div>

        {/* Mobile PoweredBy — only visible on mobile since desktop shows it in left panel */}
        <div className="lg:hidden">
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}