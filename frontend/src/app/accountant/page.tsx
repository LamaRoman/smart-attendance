'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { CreditCard, Clock, FileText, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react';

export default function AccountantDashboard() {
  const { user, language } = useAuth();
  const isNp = language === 'NEPALI';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Fetch current month payroll summary
        const now = new Date();
        // Approximate current BS month (this is a rough estimate — your app may have a helper)
        const bsYear = 2082;
        const bsMonth = 11; // Adjust based on current date

        const payrollRes = await api.get(`/payroll/records?bsYear=${bsYear}&bsMonth=${bsMonth}`);
        const payroll = (payrollRes.data as any)?.data;

        setStats({
          totalEmployees: payroll?.summary?.totalEmployees || 0,
          totalNetSalary: payroll?.summary?.totalNet || 0,
          totalDeductions: payroll?.summary?.totalDeductions || 0,
          needsRecalculation: payroll?.summary?.needsRecalculation || 0,
          records: payroll?.records || [],
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: isNp ? 'कर्मचारी संख्या' : 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: CreditCard,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: isNp ? 'कुल नेट तलब' : 'Total Net Salary',
      value: `Rs. ${(stats?.totalNetSalary || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: isNp ? 'कुल कटौती' : 'Total Deductions',
      value: `Rs. ${(stats?.totalDeductions || 0).toLocaleString()}`,
      icon: FileText,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: isNp ? 'पुनर्गणना आवश्यक' : 'Needs Recalculation',
      value: stats?.needsRecalculation || 0,
      icon: AlertCircle,
      color: stats?.needsRecalculation > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {isNp ? 'लेखापाल ड्यासबोर्ड' : 'Accountant Dashboard'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isNp ? 'तलब र वित्तीय सारांश' : 'Payroll & financial summary'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll status breakdown */}
      {stats?.records?.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            {isNp ? 'तलब स्थिति' : 'Payroll Status Overview'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['DRAFT', 'PROCESSED', 'APPROVED', 'PAID'].map((status) => {
              const count = stats.records.filter((r: any) => r.status === status).length;
              const colors: Record<string, string> = {
                DRAFT: 'text-slate-600 bg-slate-50',
                PROCESSED: 'text-blue-600 bg-blue-50',
                APPROVED: 'text-green-600 bg-green-50',
                PAID: 'text-emerald-600 bg-emerald-50',
              };
              return (
                <div key={status} className={`rounded-md p-3 ${colors[status]}`}>
                  <p className="text-xs font-medium">{status}</p>
                  <p className="text-lg font-bold mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}