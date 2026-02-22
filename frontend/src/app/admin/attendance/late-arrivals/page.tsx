'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';
import { 
  Clock, 
  AlertCircle, 
  Calendar, 
  User, 
  TrendingUp, 
  Users,
  BarChart3,
  Filter,
} from 'lucide-react';

type TimeRange = 'today' | 'week' | 'month' | 'custom';

export default function LateArrivalsPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [lateArrivals, setLateArrivals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      loadLateArrivals();
      // Auto-clear late arrival notifications
      clearNotifications();
    }
  }, [user, isAdmin, timeRange, fromDate, toDate]);

  const clearNotifications = async () => {
    await api.post('/api/notifications/clear-late-arrivals');
  };

  const loadLateArrivals = async () => {
    setLoading(true);
    
    let url = `/api/attendance/late-arrivals?range=${timeRange}`;
    if (timeRange === 'custom' && fromDate && toDate) {
      url += `&fromDate=${fromDate}&toDate=${toDate}`;
    }
    
    const res = await api.get(url);
    if (res.data) {
      setLateArrivals(res.data.records || []);
      setStats(res.data.stats || null);
    }
    setLoading(false);
  };

  const formatLate = (mins: number) => {
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} late`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} hour${h > 1 ? 's' : ''} late`;
    return `${h} hour${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''} late`;
  };

  const getRangeLabel = () => {
    switch (timeRange) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'custom': return 'Custom Range';
      default: return 'Today';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Late Arrivals</h1>
              <p className="text-sm text-slate-500">Track employees who clock in late</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Filter by:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Buttons */}
            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {range === 'today' && 'Today'}
                {range === 'week' && 'Last 7 Days'}
                {range === 'month' && 'Last 30 Days'}
                {range === 'custom' && 'Custom Range'}
              </button>
            ))}

            {/* Custom Date Inputs */}
            {timeRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="From"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="To"
                />
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Late Arrivals */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-orange-700">Total Late Arrivals</span>
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">{stats.totalLateArrivals}</p>
              <p className="text-xs text-orange-600 mt-1">{getRangeLabel()}</p>
            </div>

            {/* Average Minutes Late */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-700">Average Minutes Late</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{stats.averageMinutesLate}</p>
              <p className="text-xs text-blue-600 mt-1">mins per late arrival</p>
            </div>

            {/* Repeat Offenders */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-700">Most Frequent</span>
                <Users className="w-4 h-4 text-red-600" />
              </div>
              {stats.repeatOffenders.length > 0 ? (
                <>
                  <p className="text-lg font-bold text-red-900">
                    {stats.repeatOffenders[0].userName.split(' ')[0]}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {stats.repeatOffenders[0].lateCount} times late
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-600">No data</p>
              )}
            </div>
          </div>
        )}

        {/* Repeat Offenders Table (if more than 1) */}
        {stats && stats.repeatOffenders.length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">Top Repeat Offenders</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Rank</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Late Count</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Avg Minutes Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.repeatOffenders.slice(0, 5).map((offender: any, index: number) => (
                    <tr key={offender.userId} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-slate-200 text-slate-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{offender.userName}</p>
                          <p className="text-sm text-slate-500">{offender.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                          {offender.lateCount}x
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {offender.averageMinutesLate} mins
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Late Arrivals Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">All Late Arrivals - {getRangeLabel()}</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
            </div>
          ) : lateArrivals.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No late arrivals found for {getRangeLabel().toLowerCase()}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Check-in Time</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Minutes Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lateArrivals.map((record: any) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{record.userName}</p>
                            <p className="text-sm text-slate-500">{record.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(record.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${
                          record.minutesLate > 30 
                            ? 'bg-red-100 text-red-700'
                            : record.minutesLate > 15
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <AlertCircle className="w-4 h-4" />
                          {formatLate(record.minutesLate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}