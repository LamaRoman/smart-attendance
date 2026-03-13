'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import AccountantLayout from '@/components/AccountantLayout';
import {
  Clock, FileText, CreditCard, CalendarDays,
  AlertTriangle, ArrowRight, CheckCircle,
} from 'lucide-react';

export default function AccountantDashboard() {
  const { user, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';
  const [autoClosedCount, setAutoClosedCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await api.get('/api/attendance?status=AUTO_CLOSED&limit=50&offset=0');
        const records = (res.data as any)?.records || [];
        setAutoClosedCount(records.length);
      } catch {
        setAutoClosedCount(0);
      }
    }
    fetchPending();
  }, []);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const quickLinks = [
    {
      label: isNp ? 'उपस्थिति' : 'Attendance',
      desc: isNp ? 'AUTO_CLOSED रेकर्ड सच्याउनुहोस्' : 'Review and correct AUTO_CLOSED records',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      path: '/accountant/attendance',
      badge: autoClosedCount !== null && autoClosedCount > 0 ? autoClosedCount : null,
    },
    {
      label: isNp ? 'प्रतिवेदन' : 'Reports',
      desc: isNp ? 'मासिक र वार्षिक तलब प्रतिवेदन' : 'Monthly and annual payroll reports',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      path: '/accountant/reports',
      badge: null,
    },
    {
      label: isNp ? 'तलब' : 'Payroll',
      desc: isNp ? 'तलब रेकर्ड हेर्नुहोस्' : 'View payroll records',
      icon: CreditCard,
      color: 'bg-emerald-50 text-emerald-600',
      path: '/payroll',
      badge: null,
    },
    {
      label: isNp ? 'बिदा' : 'Leaves',
      desc: isNp ? 'कर्मचारी बिदा अनुरोध' : 'Employee leave requests',
      icon: CalendarDays,
      color: 'bg-orange-50 text-orange-600',
      path: '/leaves',
      badge: null,
    },
  ];

  return (
    <AccountantLayout>
      <div className="space-y-6">

        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-slate-900">
              {isNp ? 'नमस्ते,' : 'Hello,'} {user?.firstName} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1">{dateLabel}</p>
          </div>
        </div>

        {/* AUTO_CLOSED alert */}
        {autoClosedCount !== null && autoClosedCount > 0 && (
          <div
            onClick={() => router.push('/accountant/attendance')}
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {isNp
                  ? `${autoClosedCount} AUTO_CLOSED रेकर्डहरू सच्याउन बाँकी`
                  : `${autoClosedCount} AUTO_CLOSED record${autoClosedCount === 1 ? '' : 's'} need checkout correction`}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {isNp
                  ? 'क्लिक गर्नुहोस् र चेकआउट समय अपडेट गर्नुहोस्'
                  : 'Click to review and update checkout times'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
        )}

        {autoClosedCount === 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="p-2 bg-green-100 rounded-lg shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-800">
              {isNp
                ? 'सबै उपस्थिति रेकर्डहरू ठीक छन्'
                : 'All attendance records are in order'}
            </p>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 mb-3">
            {isNp ? 'द्रुत पहुँच' : 'Quick access'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <div
                key={link.path}
                onClick={() => router.push(link.path)}
                className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-4"
              >
                <div className={`p-3 rounded-xl shrink-0 ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                    {link.badge && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </AccountantLayout>
  );
}