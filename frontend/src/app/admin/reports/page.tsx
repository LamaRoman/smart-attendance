'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

import ProBlurOverlay from "@/components/ProBlurOverlay";
import {
  Calendar,
  CalendarDays,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Target,
  RefreshCw,
} from 'lucide-react';

interface DailyReport {
  date: string;
  summary: { totalEmployees: number; totalPresent: number; totalAbsent: number; attendanceRate: number; totalHoursWorked: number };
  present: { employee: { firstName: string; lastName: string; employeeId: string }; checkInTime: string | null; checkOutTime: string | null; duration: number | null; status: string }[];
}

interface WeeklyReport {
  summary: { totalEmployees: number; totalHoursWorked: number; avgHoursPerEmployee: number; avgDaysPerEmployee: number };
  dailyBreakdown: { date: string; dayName: string; presentCount: number; absentCount: number; totalHours: number }[];
  employeeStats: { employee: { firstName: string; lastName: string; employeeId: string }; daysPresent: number; totalHours: number }[];
}

interface MonthlyReport {
  summary: { totalEmployees: number; totalWorkingDays: number; avgAttendanceRate: number; totalHoursWorked: number };
  weeklyBreakdown?: { week: number; startDate: string; endDate: string; employeesPresent: number; totalHours: number }[];
  employeePerformance?: { employee: { firstName: string; lastName: string; employeeId: string }; daysPresent: number; totalHours: number; attendanceRate: number; rating: string }[];
}

type ReportTab = 'daily' | 'weekly' | 'monthly';

export default function AdminReportsPage() {
  const { user, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [tab, setTab] = useState<ReportTab>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [featureChecked, setFeatureChecked] = useState(false);
  const [orgTier, setOrgTier] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== "ORG_ADMIN" || featureChecked) return;
    (async () => {
      const subRes = await api.get("/api/org-settings/subscription");
      if (subRes.data) { setOrgTier((subRes.data as any)?.plan?.tier || null); }
      setFeatureChecked(true);
    })();
  }, [user, featureChecked]);
  const loadDaily = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/reports/daily?date=' + reportDate);
    if (res.data) {
      setDaily(res.data as DailyReport);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, [reportDate]);

  const loadWeekly = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/reports/weekly?startDate=' + weekStart);
    if (res.data) {
      setWeekly(res.data as WeeklyReport);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, [weekStart]);

  const loadMonthly = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/reports/monthly?year=' + selectedYear + '&month=' + selectedMonth);
    if (res.data) {
      setMonthly(res.data as MonthlyReport);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN' && featureChecked) {
      if (tab === 'daily') loadDaily();
      if (tab === 'weekly') loadWeekly();
      if (tab === 'monthly') loadMonthly();
    }
  }, [user, tab, featureChecked, loadDaily, loadWeekly, loadMonthly]);

  const changeWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return isNp ? `${h} घण्टा ${m} मि` : `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  const isStarter = orgTier === "STARTER";
  const tabs: { key: ReportTab; label: string; icon: React.ElementType; locked?: boolean }[] = [
    { key: "daily", label: isNp ? "दैनिक" : "Daily", icon: Calendar },
    { key: "weekly", label: isNp ? "साप्ताहिक" : "Weekly", icon: CalendarDays, locked: isStarter },
    { key: "monthly", label: isNp ? "मासिक" : "Monthly", icon: BarChart3, locked: isStarter },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with title and refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'प्रतिवेदन' : 'Reports'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'उपस्थिति विश्लेषण र प्रतिवेदन' : 'Attendance analytics & reports'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => {
                if (tab === 'daily') loadDaily();
                if (tab === 'weekly') loadWeekly();
                if (tab === 'monthly') loadMonthly();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Report Type Tabs - Minimal */}
        <div className="flex gap-1 border-b border-slate-200 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${t.locked ? "text-slate-300 cursor-not-allowed" : tab === t.key ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.locked && (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-700 rounded-full">PRO</span>
              )}
              {tab === t.key && !t.locked && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
          </div>
        )}

        {/* ===== DAILY REPORT ===== */}
        {tab === 'daily' && !loading && (
          <div className="space-y-6">
            {/* Date Picker - Clean */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isNp ? 'दैनिक प्रतिवेदन' : 'Daily report'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isNp ? 'मिति चयन गर्नुहोस्' : 'Select a date'}
                  </p>
                </div>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            {daily && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: isNp ? 'जम्मा कर्मचारी' : 'Total staff', value: daily.summary.totalEmployees, icon: Users, bg: 'bg-slate-50', iconColor: 'text-slate-600' },
                    { label: isNp ? 'उपस्थित' : 'Present', value: daily.summary.totalPresent, icon: CheckCircle, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                    { label: isNp ? 'अनुपस्थित' : 'Absent', value: daily.summary.totalAbsent, icon: XCircle, bg: 'bg-rose-50', iconColor: 'text-rose-600' },
                    { label: isNp ? 'उपस्थिति दर' : 'Rate', value: daily.summary.attendanceRate + '%', icon: Target, bg: 'bg-slate-100', iconColor: 'text-slate-900' },
                    { label: isNp ? 'जम्मा घण्टा' : 'Total hours', value: daily.summary.totalHoursWorked + 'h', icon: Clock, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
                        <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                      </div>
                      <div className="text-xl font-semibold text-slate-900 tracking-tight">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Records Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {isNp ? 'कर्मचारी' : 'Employee'}
                          </th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {isNp ? 'चेक इन' : 'Check in'}
                          </th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {isNp ? 'चेक आउट' : 'Check out'}
                          </th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {isNp ? 'अवधि' : 'Duration'}
                          </th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {isNp ? 'स्थिति' : 'Status'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...((daily as any).present || []).map((r: any) => ({ ...r, _status: r.status || 'PRESENT' })), ...((daily as any).absent || []).map((a: any) => ({ employee: { firstName: a.firstName, lastName: a.lastName, employeeId: a.employeeId }, checkInTime: null, checkOutTime: null, duration: null, _status: 'ABSENT' }))].map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-slate-700">
                                    {r.employee.firstName?.[0]}{r.employee.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{r.employee.firstName} {r.employee.lastName}</div>
                                  <div className="text-xs text-slate-400">{r.employee.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="text-sm text-slate-600">
                                {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="text-sm text-slate-600">
                                {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="text-sm text-slate-600">
                                {r.duration ? formatDuration(r.duration) : '—'}
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${r._status === 'PRESENT' || r._status === 'CHECKED_OUT' ? 'bg-emerald-500' :
                                    r._status === 'CHECKED_IN' ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} />
                                <span className={`text-xs font-medium ${r._status === 'PRESENT' || r._status === 'CHECKED_OUT' ? 'text-emerald-700' :
                                    r._status === 'CHECKED_IN' ? 'text-amber-700' : 'text-rose-700'
                                  }`}>
                                  {r._status === 'PRESENT' || r._status === 'CHECKED_OUT' ? (isNp ? 'उपस्थित' : 'Present') :
                                    r._status === 'CHECKED_IN' ? (isNp ? 'सक्रिय' : 'Active') :
                                      (isNp ? 'अनुपस्थित' : 'Absent')}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {daily.present.length === 0 && (!daily as any).absent?.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 px-5 text-center">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-6 h-6 text-slate-400" />
                              </div>
                              <p className="text-sm font-medium text-slate-900 mb-1">
                                {isNp ? 'कुनै रेकर्ड छैन' : 'No records found'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isNp ? 'यस मितिमा कुनै उपस्थिति छैन' : 'No attendance records for this date'}
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== WEEKLY REPORT ===== */}
        {tab === 'weekly' && (
          <div className={`space-y-6 ${isStarter ? "relative pro-blur-parent min-h-[300px]" : ""}`}>
            {isStarter && <ProBlurOverlay isNp={isNp} message={isNp ? "साप्ताहिक रिपोर्ट हेर्न अपग्रेड गर्नुहोस्" : "Upgrade to access weekly reports"} onUpgrade={() => router.push("/admin/billing")} />}
            {isStarter && !weekly && <div className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 p-5 h-24"></div><div className="bg-white rounded-xl border border-slate-200 p-5 h-40"></div><div className="bg-white rounded-xl border border-slate-200 p-5 h-32"></div></div>}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isNp ? 'साप्ताहिक प्रतिवेदन' : 'Weekly report'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isNp ? 'हप्ता चयन गर्नुहोस्' : 'Select a week'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeWeek(-1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                    {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => changeWeek(1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {weekly && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: isNp ? 'जम्मा कर्मचारी' : 'Total staff', value: weekly.summary.totalEmployees, icon: Users, bg: 'bg-slate-50', iconColor: 'text-slate-600' },
                    { label: isNp ? 'जम्मा घण्टा' : 'Total hours', value: weekly.summary.totalHoursWorked + 'h', icon: Clock, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: isNp ? 'औसत घण्टा' : 'Avg hours', value: weekly.summary.avgHoursPerEmployee + 'h', icon: BarChart3, bg: 'bg-slate-100', iconColor: 'text-slate-900' },
                    { label: isNp ? 'औसत दिन' : 'Avg days', value: weekly.summary.avgDaysPerEmployee, icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
                        <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                      </div>
                      <div className="text-xl font-semibold text-slate-900 tracking-tight">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Breakdown */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">
                      {isNp ? 'दैनिक विवरण' : 'Daily breakdown'}
                    </h3>
                    <div className="space-y-2">
                      {weekly.dailyBreakdown.map((day, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{day.dayName}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{day.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              <span className="text-emerald-600 font-medium">{day.presentCount}</span>
                              <span className="text-slate-400"> / </span>
                              <span className="text-rose-600">{day.absentCount}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{day.totalHours}h</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">
                      {isNp ? 'उत्कृष्ट कर्मचारी' : 'Top performers'}
                    </h3>
                    <div className="space-y-2">
                      {weekly.employeeStats.slice(0, 5).map((emp, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                i === 1 ? 'bg-slate-200 text-slate-700' :
                                  i === 2 ? 'bg-orange-100 text-orange-700' :
                                    'bg-slate-100 text-slate-900'
                              }`}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{emp.employee.firstName} {emp.employee.lastName}</div>
                              <div className="text-xs text-slate-500">{emp.employee.employeeId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">{emp.totalHours}h</div>
                            <div className="text-xs text-slate-500">{emp.daysPresent} {isNp ? 'दिन' : 'days'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== MONTHLY REPORT ===== */}
        {tab === 'monthly' && (
          <div className={`space-y-6 ${isStarter ? "relative pro-blur-parent min-h-[300px]" : ""}`}>
            {isStarter && <ProBlurOverlay isNp={isNp} message={isNp ? "मासिक रिपोर्ट हेर्न अपग्रेड गर्नुहोस्" : "Upgrade to access monthly reports"} onUpgrade={() => router.push("/admin/billing")} />}
            {isStarter && !monthly && <div className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 p-5 h-24"></div><div className="bg-white rounded-xl border border-slate-200 p-5 h-40"></div><div className="bg-white rounded-xl border border-slate-200 p-5 h-32"></div></div>}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isNp ? 'मासिक प्रतिवेदन' : 'Monthly report'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isNp ? 'महिना चयन गर्नुहोस्' : 'Select a month'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {isNp
                          ? ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'][i]
                          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {monthly && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: isNp ? 'जम्मा कर्मचारी' : 'Total staff', value: monthly.summary.totalEmployees, icon: Users, bg: 'bg-slate-50', iconColor: 'text-slate-600' },
                    { label: isNp ? 'काम गर्ने दिन' : 'Working days', value: monthly.summary.totalWorkingDays, icon: Calendar, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: isNp ? 'औसत उपस्थिति' : 'Avg attendance', value: monthly.summary.avgAttendanceRate + '%', icon: Target, bg: 'bg-slate-100', iconColor: 'text-slate-900' },
                    { label: isNp ? 'जम्मा घण्टा' : 'Total hours', value: monthly.summary.totalHoursWorked + 'h', icon: Clock, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
                        <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                      </div>
                      <div className="text-xl font-semibold text-slate-900 tracking-tight">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly Breakdown */}
                {monthly.weeklyBreakdown && monthly.weeklyBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">
                      {isNp ? 'साप्ताहिक विवरण' : 'Weekly breakdown'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {monthly.weeklyBreakdown.map((w) => (
                        <div key={w.week} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                            {isNp ? 'हप्ता' : 'Week'} {w.week}
                          </div>
                          <div className="text-sm font-semibold text-slate-900 mb-2">
                            {w.employeesPresent} {isNp ? 'कर्मचारी' : 'staff'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {w.startDate} - {w.endDate}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {w.totalHours}h
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employee Performance */}
                {monthly.employeePerformance && monthly.employeePerformance.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {isNp ? 'कर्मचारी कार्यसम्पादन' : 'Employee performance'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                              {isNp ? 'कर्मचारी' : 'Employee'}
                            </th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                              {isNp ? 'उपस्थित दिन' : 'Days'}
                            </th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                              {isNp ? 'घण्टा' : 'Hours'}
                            </th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                              {isNp ? 'दर' : 'Rate'}
                            </th>
                            <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                              {isNp ? 'मूल्याङ्कन' : 'Rating'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthly.employeePerformance.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                                    <span className="text-xs font-medium text-slate-700">
                                      {emp.employee.firstName?.[0]}{emp.employee.lastName?.[0]}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">
                                      {emp.employee.firstName} {emp.employee.lastName}
                                    </div>
                                    <div className="text-xs text-slate-400">{emp.employee.employeeId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-sm text-slate-600">{emp.daysPresent}</td>
                              <td className="py-3 px-5 text-sm text-slate-600">{emp.totalHours}h</td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">{emp.attendanceRate}%</span>
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-slate-1000 rounded-full"
                                      style={{ width: `${emp.attendanceRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${emp.rating === 'Excellent' ? 'bg-emerald-500' :
                                      emp.rating === 'Good' ? 'bg-blue-500' :
                                        emp.rating === 'Average' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`} />
                                  <span className={`text-xs font-medium ${emp.rating === 'Excellent' ? 'text-emerald-700' :
                                      emp.rating === 'Good' ? 'text-blue-700' :
                                        emp.rating === 'Average' ? 'text-amber-700' : 'text-rose-700'
                                    }`}>
                                    {emp.rating === 'Excellent' ? (isNp ? 'उत्कृष्ट' : 'Excellent') :
                                      emp.rating === 'Good' ? (isNp ? 'राम्रो' : 'Good') :
                                        emp.rating === 'Average' ? (isNp ? 'औसत' : 'Average') :
                                          (isNp ? 'सुधार आवश्यक' : 'Needs improvement')}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}