'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { CheckCircle, XCircle, Crown, Zap, MessageCircle, Mail, Lock } from 'lucide-react';

const FEATURES = [
  { label: 'BS Calendar', starter: true, ops: true },
  { label: 'Geofencing Attendance', starter: true, ops: true },
  { label: 'Nepal Holiday Sync', starter: true, ops: true },
  { label: 'SSF and TDS Calculation', starter: true, ops: true },
  { label: 'Leave Management', starter: true, ops: true },
  { label: 'Basic Payroll', starter: true, ops: true },
  { label: 'Daily Report', starter: true, ops: true },
  { label: 'Weekly and Monthly Reports', starter: false, ops: true },
  { label: 'Payroll Workflow', starter: false, ops: true },
  { label: 'Multi-Month and Annual Reports', starter: false, ops: true },
  { label: 'CSV and PDF Downloads', starter: false, ops: true },
  { label: 'Notifications', starter: false, ops: true },
  { label: 'Onboarding', starter: false, ops: true },
  { label: 'Manual Correction', starter: false, ops: true },
  { label: 'Audit Log', starter: false, ops: true },
];

export default function BillingPage() {
  const { user, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !user || user.role !== 'ORG_ADMIN') {
      if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login');
      return;
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await api.get('/api/v1/org-settings/subscription');
      if (res.data) {
        const d = res.data as any;
        setCurrentTier(d?.plan?.tier || 'STARTER');
        setPlanData(d);
      }
      setLoading(false);
    })();
  }, [user]);

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  const isStarter = currentTier === 'STARTER';
  const isAnnual = planData?.billingCycle === 'ANNUAL';
  const opsPrice = planData?.plan?.pricePerEmployee ?? 250;
  const opsSetupFee = planData?.plan?.defaultSetupFee ?? null;
  const annualDiscountPercent = Number(planData?.plan?.annualDiscountPercent ?? 0);
  const annualPrice = Math.round(opsPrice * 12 * (1 - annualDiscountPercent / 100));

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Billing & Plan</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your subscription and plan</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Starter */}
          <div className={"rounded-xl border-2 p-6 flex flex-col " + (isStarter ? "border-slate-900 bg-white ring-2 ring-slate-900/5" : "border-slate-200 bg-slate-50")}>
            {isStarter && <span className="self-start px-2.5 py-1 text-[10px] font-semibold bg-slate-900 text-white rounded-full mb-4">CURRENT PLAN</span>}
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Starter</h2>
            </div>
            <div className="mt-2 mb-1"><span className="text-3xl font-bold text-slate-900">FREE</span></div>
            <p className="text-xs text-slate-500 mb-6">Up to 5 employees &mdash; Free forever</p>
            <div className="space-y-2.5 flex-1">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {f.starter ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                  <span className={"text-xs " + (f.starter ? "text-slate-700" : "text-slate-400")}>{f.label}</span>
                </div>
              ))}
            </div>
            {isStarter && <div className="mt-6 pt-4 border-t border-slate-200"><div className="text-xs text-slate-500 text-center">You are on this plan</div></div>}
          </div>
          {/* Operations */}
          <div className={"rounded-xl border-2 p-6 flex flex-col " + (isStarter ? "border-slate-200 bg-white" : "border-emerald-500 bg-white ring-2 ring-emerald-500/10")}>
            <div className="flex items-center gap-2 mb-4">
              {isStarter ? (
                <span className="px-2.5 py-1 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">RECOMMENDED</span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500 text-white rounded-full">CURRENT PLAN</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Operations</h2>
            </div>
            <div className="mt-2 mb-1">
              <span className="text-3xl font-bold text-slate-900">Rs. {opsPrice}</span>
              <span className="text-sm text-slate-500 ml-1">/emp/month</span>
              {annualDiscountPercent > 0 && (
                <span className="ml-2 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                  {annualDiscountPercent}% off annually
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-6">Up to 100 employees{opsSetupFee ? ` — Rs. ${Number(opsSetupFee).toLocaleString()} setup fee` : ''}</p>
            <div className="space-y-2.5 flex-1">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-slate-700">{f.label}</span>
                </div>
              ))}
            </div>
            {isStarter ? (
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
                {annualDiscountPercent > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <p className="text-[11px] text-violet-700">Pay annually — save {annualDiscountPercent}% (Rs. {annualPrice}/emp/yr)</p>
                  </div>
                )}
                <a href="https://wa.me/9779761154213?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Operations%20plan" target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                  <MessageCircle className="w-4 h-4" />Upgrade via WhatsApp
                </a>
                <a href="mailto:support@zentaralabs.com?subject=Upgrade%20to%20Operations" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200">
                  <Mail className="w-4 h-4" />Upgrade via Email
                </a>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-emerald-100"><div className="text-xs text-emerald-600 text-center font-medium">You are on this plan</div></div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Need help?</h3>
          <p className="text-xs text-slate-500 mb-3">Contact us for billing questions or upgrades.</p>
          <div className="flex items-center gap-4">
            <a href="https://wa.me/9779761154213" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> +977 9761154213</a>
            <a href="mailto:support@zentaralabs.com" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> support@zentaralabs.com</a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
