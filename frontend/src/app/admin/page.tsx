'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import DocumentCompliance from '@/components/DocumentCompliance';
import {
  Users, CheckCircle, XCircle, Percent, ArrowRight,
  X, Search, AlertTriangle, Cake,
} from 'lucide-react';

interface PresentRecord {
  employee: { id: string; firstName: string; lastName: string; employeeId: string; };
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
}

interface AbsentEmployee {
  id: string; firstName: string; lastName: string;
  employeeId: string; email: string; membershipId: string;
}

interface DailyReport {
  summary: {
    totalEmployees: number; totalPresent: number; totalAbsent: number;
    attendanceRate: number; totalHoursWorked: number; lateArrivals?: number;
  };
  present: PresentRecord[];
  absent: AbsentEmployee[];
}

interface BirthdayEmployee {
  id: string; firstName: string; lastName: string;
  employeeId: string | null; dateOfBirth: string;
  daysUntil: number; isToday: boolean;
}

export default function AdminDashboard() {
  const { user, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [stats, setStats] = useState({
    totalEmployees: 0, todayPresent: 0, todayAbsent: 0,
    avgAttendance: 0, lateArrivals: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [presentList, setPresentList] = useState<PresentRecord[]>([]);
  const [absentList, setAbsentList] = useState<AbsentEmployee[]>([]);
  const [slideOver, setSlideOver] = useState<'present' | 'absent' | null>(null);
  const [search, setSearch] = useState('');
  const [birthdays, setBirthdays] = useState<BirthdayEmployee[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
      loadRecentAttendance();
      loadBirthdays();
    }
  }, [user]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlideOver(null); };
    if (slideOver) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [slideOver]);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get('/api/reports/daily?date=' + today);
    if (res.data) {
      const data = res.data as DailyReport;
      setStats({
        totalEmployees: data.summary.totalEmployees,
        todayPresent: data.summary.totalPresent,
        todayAbsent: data.summary.totalAbsent,
        avgAttendance: data.summary.attendanceRate,
        lateArrivals: data.summary.lateArrivals ?? 0,
      });
      setPresentList(data.present || []);
      setAbsentList(data.absent || []);
    }
  };

  const loadRecentAttendance = async () => {
    const res = await api.get('/api/attendance?limit=5');
    if (res.data) setRecentAttendance((res.data as any).records || []);
  };

  const loadBirthdays = async () => {
    const res = await api.get('/api/users/upcoming-birthdays?days=30');
    if (res.data && Array.isArray(res.data)) setBirthdays(res.data as BirthdayEmployee[]);
  };

  const openSlideOver = (type: 'present' | 'absent') => { setSearch(''); setSlideOver(type); };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatBirthday = (dob: string) => {
    const d = new Date(dob);
    return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'long', day: 'numeric' });
  };

  const filteredPresent = presentList.filter((r) =>
    `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredAbsent = absentList.filter((emp) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const statCards = [
    {
      title: isNp ? 'जम्मा कर्मचारी' : 'Total employees',
      value: stats.totalEmployees, icon: Users,
      iconBg: { background: '#f1f5f9' }, iconColor: { color: '#475569' },
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: isNp ? 'आज उपस्थित' : 'Present today',
      value: stats.todayPresent, icon: CheckCircle,
      iconBg: { background: '#dcfce7' }, iconColor: { color: '#16a34a' },
      onClick: () => openSlideOver('present'),
    },
    {
      title: isNp ? 'आज अनुपस्थित' : 'Absent today',
      value: stats.todayAbsent, icon: XCircle,
      iconBg: { background: '#fee2e2' }, iconColor: { color: '#dc2626' },
      onClick: () => openSlideOver('absent'),
    },
    {
      title: isNp ? 'उपस्थिति दर' : 'Attendance rate',
      value: stats.avgAttendance + '%', icon: Percent,
      iconBg: { background: '#e2e8f0' }, iconColor: { color: '#0f172a' },
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: isNp ? 'ढिलो आगमन' : 'Late arrivals',
      value: stats.lateArrivals, icon: AlertTriangle,
      iconBg: { background: '#fef9c3' }, iconColor: { color: '#d97706' },
      onClick: () => router.push('/admin/attendance/late-arrivals'),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-slate-900">
              {isNp ? 'नमस्ते,' : 'Hello,'} {user?.firstName} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'आजको उपस्थिति सारांश' : "Today's attendance summary"}
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {new Date().toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              onClick={stat.onClick}
              className={`bg-white rounded-xl border border-slate-200/60 p-5 transition-all ${
                stat.onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-lg" style={stat.iconBg}>
                  <stat.icon className="w-4 h-4" style={stat.iconColor} />
                </div>
                {stat.onClick && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-slate-900 tracking-tight">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium">{stat.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Birthdays — only shown when there are birthdays in the next 30 days */}
        {birthdays.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="p-2 rounded-lg" style={{ background: '#fdf4ff' }}>
                <Cake className="w-4 h-4" style={{ color: '#a855f7' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isNp ? 'आगामी जन्मदिनहरू' : 'Upcoming birthdays'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isNp ? 'अर्को ३० दिनमा' : 'Next 30 days'} · {birthdays.length} {isNp ? 'कर्मचारी' : (birthdays.length === 1 ? 'employee' : 'employees')}
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {birthdays.map((emp) => (
                <div
                  key={emp.id}
                  className={`px-5 py-3 flex items-center gap-3 transition-colors ${
                    emp.isToday ? 'bg-purple-50/40' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-medium"
                    style={emp.isToday
                      ? { background: '#f3e8ff', color: '#9333ea' }
                      : { background: '#f1f5f9', color: '#475569' }}
                  >
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </span>
                      {emp.isToday && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: '#f3e8ff', color: '#9333ea' }}
                        >
                          {isNp ? 'आज! 🎂' : 'Today! 🎂'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatBirthday(emp.dateOfBirth)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {emp.isToday ? (
                      <span className="text-base">🎉</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        {isNp
                          ? `${emp.daysUntil} दिनमा`
                          : `in ${emp.daysUntil} day${emp.daysUntil === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Attendance Table */}
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {isNp ? 'हालको उपस्थिति' : 'Recent attendance'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNp ? 'पछिल्ला ५ रेकर्डहरू' : 'Last 5 records'}
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/attendance')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {isNp ? 'सबै हेर्नुहोस्' : 'View all'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'कर्मचारी' : 'Employee'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'क्लक इन' : 'Clock in'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'क्लक आउट' : 'Clock out'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'स्थिति' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAttendance.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-700">
                            {record.user?.firstName?.[0]}{record.user?.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {record.user?.firstName} {record.user?.lastName}
                          </div>
                          <div className="text-xs text-slate-400">{record.user?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-sm font-medium text-slate-900">{formatTime(record.checkInTime)}</div>
                    </td>
                    <td className="py-3 px-5">
                      {record.checkOutTime ? (
                        <div className="text-sm text-slate-600">{formatTime(record.checkOutTime)}</div>
                      ) : (
                        <span className="text-xs text-slate-400">{isNp ? 'क्लक आउट बाँकी' : '—'}</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${record.checkOutTime ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className={`text-xs font-medium ${record.checkOutTime ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {record.checkOutTime ? (isNp ? 'पूरा' : 'Completed') : (isNp ? 'सक्रिय' : 'Active')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentAttendance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="text-sm text-slate-400">{isNp ? 'आजको कुनै रेकर्ड छैन' : 'No records today'}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Compliance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <DocumentCompliance language={language} />
        </div>

      </div>

      {/* Slide-over */}
      {slideOver && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSlideOver(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {slideOver === 'present' ? (isNp ? 'आज उपस्थित' : 'Present today') : (isNp ? 'आज क्लक इन नगरेका' : 'Not yet clocked in today')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {slideOver === 'present'
                    ? `${presentList.length} ${isNp ? 'कर्मचारी' : 'employees'}`
                    : `${absentList.length} ${isNp ? 'कर्मचारी' : 'employees'}`}
                </p>
              </div>
              <button onClick={() => setSlideOver(null)} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isNp ? 'नाम खोज्नुहोस्...' : 'Search by name...'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {slideOver === 'present' ? (
                filteredPresent.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">{isNp ? 'कोही भेटिएन' : 'No results found'}</div>
                ) : (
                  filteredPresent.map((record) => (
                    <div key={record.employee.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-emerald-700">{record.employee.firstName[0]}{record.employee.lastName[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{record.employee.firstName} {record.employee.lastName}</div>
                        <div className="text-xs text-slate-400">{record.employee.employeeId}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-medium text-emerald-600">{formatTime(record.checkInTime)}</div>
                        <div className="text-xs text-slate-400">{record.checkOutTime ? formatTime(record.checkOutTime) : (isNp ? 'सक्रिय' : 'Active')}</div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                filteredAbsent.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">{isNp ? 'कोही भेटिएन' : 'No results found'}</div>
                ) : (
                  filteredAbsent.map((emp) => (
                    <div key={emp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-rose-500">{emp.firstName[0]}{emp.lastName[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-slate-400">{emp.employeeId}</div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{isNp ? 'क्लक इन छैन' : 'Not clocked in'}</span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}