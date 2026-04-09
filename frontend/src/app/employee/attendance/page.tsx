'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  ChevronLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Timer,
  AlertCircle,
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

const BS_MONTHS_EN = [
  'Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin',
  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra',
];
const BS_MONTHS_NP = [
  'बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन',
  'कार्तिक','मंसिर','पौष','माघ','फाल्गुन','चैत्र',
];

interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'AUTO_CLOSED';
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  notes: string | null;
}

interface AttendanceSummary {
  daysPresent: number;
  totalMinutes: number;
  lateCount: number;
  workStartTime: string | null;
}

interface AttendanceData {
  records: AttendanceRecord[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  summary: AttendanceSummary | null;
}

export default function EmployeeAttendancePage() {
  const { user, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  // Approximate current BS year/month (same formula used in my-salary page)
  const now = new Date();
  const currentBsYear  = now.getMonth() >= 3 ? now.getFullYear() + 57 : now.getFullYear() + 56;
  const currentBsMonth = ((now.getMonth() + 9) % 12) + 1; // rough approximation

  const [selectedYear,  setSelectedYear]  = useState(currentBsYear);
  const [selectedMonth, setSelectedMonth] = useState(currentBsMonth);
  const [data,    setData]    = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const yearRange = Array.from({ length: 4 }, (_, i) => currentBsYear - 2 + i);

  const loadAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(
        `/api/v1/attendance/my?bsYear=${selectedYear}&bsMonth=${selectedMonth}&limit=50&offset=0`
      );
      if (res.error) throw new Error(res.error.message);
      setData(res.data as AttendanceData);
    } catch (e: any) {
      setError(e.message || 'Failed to load attendance');
    }
    setLoading(false);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return isNp ? `${h} घ. ${m} मि.` : `${h}h ${m}m`;
  };

  const isLateRecord = (record: AttendanceRecord, workStartTime: string | null): boolean => {
    if (!workStartTime || !record.checkInTime) return false;
    const [startHour, startMin] = workStartTime.split(':').map(Number);
    const checkIn   = new Date(record.checkInTime);
    const workStart = new Date(checkIn);
    workStart.setHours(startHour, startMin, 0, 0);
    return checkIn > workStart;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }
  if (!user) return null;

  const summary = data?.summary ?? null;
  const records = data?.records ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => router.push('/employee')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-gray-400 hover:text-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="bg-slate-900 p-2 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                {isNp ? 'उपस्थिति इतिहास' : 'Attendance History'}
              </h1>
              <p className="text-xs text-gray-500">{user.firstName} {user.lastName}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">

        {/* Month / Year selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {isNp ? 'वर्ष (BS)' : 'BS Year'}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:border-slate-400"
              >
                {yearRange.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {isNp ? 'महिना' : 'Month'}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:border-slate-400"
              >
                {BS_MONTHS_EN.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {isNp ? BS_MONTHS_NP[i] : m}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadAttendance}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
            >
              {loading
                ? (isNp ? 'लोड...' : 'Loading...')
                : (isNp ? 'हेर्नुहोस्' : 'View')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
              label={isNp ? 'उपस्थित' : 'Days Present'}
              value={String(summary.daysPresent)}
              color="emerald"
            />
            <StatCard
              icon={<Timer className="w-4 h-4 text-blue-600" />}
              label={isNp ? 'जम्मा घण्टा' : 'Total Hours'}
              value={`${Math.floor(summary.totalMinutes / 60)}h ${summary.totalMinutes % 60}m`}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
              label={isNp ? 'ढिलो आगमन' : 'Late Arrivals'}
              value={String(summary.lateCount)}
              color="amber"
            />
          </div>
        )}

        {/* Records */}
        {data && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {isNp
                  ? `${BS_MONTHS_NP[selectedMonth - 1]} ${selectedYear}`
                  : `${BS_MONTHS_EN[selectedMonth - 1]} ${selectedYear}`}
              </h2>
              {summary && (
                <span className="text-xs text-slate-400">
                  {summary.daysPresent} {isNp ? 'रेकर्ड' : 'record(s)'}
                </span>
              )}
            </div>

            {records.length === 0 ? (
              <div className="py-14 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {isNp ? 'यस महिनामा कोई उपस्थिति रेकर्ड छैन' : 'No attendance records for this month'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map((record) => {
                  const late       = isLateRecord(record, summary?.workStartTime ?? null);
                  const isActive   = record.status === 'CHECKED_IN';
                  const autoClosed = record.status === 'AUTO_CLOSED';

                  return (
                    <div key={record.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors">
                      {/* Left: day badge + times */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                          isActive   ? 'bg-green-100 text-green-700' :
                          late       ? 'bg-amber-100 text-amber-700' :
                                       'bg-slate-100 text-slate-700'
                        }`}>
                          {record.bsDay}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatTime(record.checkInTime)}
                            {record.checkOutTime && (
                              <span className="text-slate-400 font-normal">
                                {' → '}{formatTime(record.checkOutTime)}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {late && !isActive && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                {isNp ? 'ढिलो' : 'Late'}
                              </span>
                            )}
                            {autoClosed && (
                              <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                                {isNp ? 'स्वतः बन्द' : 'Auto-closed'}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                {isNp ? 'सक्रिय' : 'Active'}
                              </span>
                            )}
                            {!late && !isActive && !autoClosed && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                {isNp ? 'समयमा' : 'On time'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: duration */}
                      <div className="text-right shrink-0">
                        {record.duration != null ? (
                          <p className="text-sm font-semibold text-slate-700">
                            {formatDuration(record.duration)}
                          </p>
                        ) : isActive ? (
                          <p className="text-xs text-green-600 font-medium animate-pulse">
                            {isNp ? 'जारी छ' : 'In progress'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!data && !loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {isNp ? 'महिना छनौट गर्नुहोस्' : 'Select a month to view'}
            </p>
            <p className="text-xs text-slate-400">
              {isNp
                ? 'वर्ष र महिना छनौट गरी "हेर्नुहोस्" थिच्नुहोस्'
                : 'Choose a BS year and month then tap View'}
            </p>
          </div>
        )}

      </div>
      <PoweredBy />
    </div>
  );
}

/* ── Stat card sub-component ── */
function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const cls = {
    emerald: 'bg-emerald-50 border-emerald-100',
    blue:    'bg-blue-50    border-blue-100',
    amber:   'bg-amber-50   border-amber-100',
  }[color];

  return (
    <div className={`${cls} rounded-xl border p-3 text-center`}>
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-base font-bold text-slate-900 leading-tight">{value}</p>
      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{label}</p>
    </div>
  );
}