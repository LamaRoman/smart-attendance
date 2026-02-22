'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import UserDocumentsModal from '@/components/UserDocumentsModal';
import DocumentCompliance from '@/components/DocumentCompliance';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
  ArrowRight,
  QrCode,
  FileText,
  Calendar,
} from 'lucide-react';

interface DailyReport {
  summary: {
    totalEmployees: number;
    totalPresent: number;
    totalAbsent: number;
    attendanceRate: number;
    totalHoursWorked: number;
  };
}

export default function AdminDashboard() {
  const { user, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    avgAttendance: 0,
    totalHoursToday: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  // Document modal state
  const [docUserId, setDocUserId] = useState<string | null>(null);
  const [docUserName, setDocUserName] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') {
      loadStats();
      loadRecentAttendance();
    }
  }, [user]);

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
        totalHoursToday: data.summary.totalHoursWorked,
      });
    }
  };

  const loadRecentAttendance = async () => {
    const res = await api.get('/api/attendance?limit=5');
    if (res.data) {
      setRecentAttendance((res.data as any).records || []);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

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
      value: stats.totalEmployees,
      icon: Users,
      bg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    {
      title: isNp ? 'आज उपस्थित' : 'Present today',
      value: stats.todayPresent,
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: isNp ? 'आज अनुपस्थित' : 'Absent today',
      value: stats.todayAbsent,
      icon: XCircle,
      bg: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
    {
      title: isNp ? 'उपस्थिति दर' : 'Attendance rate',
      value: stats.avgAttendance + '%',
      icon: Percent,
      bg: 'bg-slate-100',
      iconColor: 'text-slate-900',
    },
    {
      title: isNp ? 'आजको घण्टा' : 'Hours today',
      value: stats.totalHoursToday + 'h',
      icon: Clock,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
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
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl border border-slate-200/60 p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-slate-900 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 font-medium">{stat.title}</div>
              </div>
            </div>
          ))}
        </div>

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
                    {isNp ? 'स्थिति' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAttendance.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-700">
                            {record.user?.firstName?.[0]}
                            {record.user?.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {record.user?.firstName} {record.user?.lastName}
                            </div>
                            <div className="text-xs text-slate-400">{record.user?.employeeId}</div>
                          </div>
                          <button
                            onClick={() => {
                              setDocUserId(record.user.id);
                              setDocUserName(`${record.user.firstName} ${record.user.lastName}`);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                            title={isNp ? 'दस्तावेज़' : 'Documents'}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-sm font-medium text-slate-900">
                        {formatTime(record.checkInTime)}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      {record.checkOutTime ? (
                        <div className="text-sm text-slate-600">{formatTime(record.checkOutTime)}</div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {isNp ? 'चेक आउट बाँकी' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            record.checkOutTime ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            record.checkOutTime ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {record.checkOutTime
                            ? isNp ? 'पूरा' : 'Completed'
                            : isNp ? 'सक्रिय' : 'Active'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentAttendance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="text-sm text-slate-400">
                        {isNp ? 'आजको कुनै रेकर्ड छैन' : 'No records today'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Compliance — fixed: now inside space-y-8 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <DocumentCompliance language={language} />
        </div>

      </div>

      {/* Modal stays outside the content div — it's a full-screen overlay */}
      <UserDocumentsModal
        isOpen={!!docUserId}
        onClose={() => setDocUserId(null)}
        userId={docUserId || ''}
        userName={docUserName}
        language={language}
      />
    </AdminLayout>
  );
}