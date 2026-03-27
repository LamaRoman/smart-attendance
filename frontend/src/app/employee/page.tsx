'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  LogOut,
  Shield,
  Clock,
  CheckCircle,
  CalendarDays,
  Timer,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
  BarChart2,
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

interface AttendanceStatus {
  isClockedIn: boolean;
  record: {
    id: string;
    checkInTime: string;
  } | null;
  currentDuration: {
    minutes: number;
    formatted: string;
  } | null;
}

interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
  status: string;
}

export default function EmployeeDashboard() {
  const { user, isLoading, logout, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
 
  useEffect(() => {
    if (user) {
      loadStatus();
      loadRecords();
    }
  }, [user]);

  useEffect(() => {
    if (user && status?.isClockedIn) {
      const interval = setInterval(loadStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [user, status?.isClockedIn]);

  const loadStatus = async () => {
    const res = await api.get('/api/attendance/status');
    if (res.data) setStatus(res.data as AttendanceStatus);
  };

  const loadRecords = async () => {
    const res = await api.get('/api/attendance/my?limit=10');
    if (res.data) setRecords((res.data as { records: AttendanceRecord[] }).records);
  };

  const handleScan = async (qrPayload: string) => {
    setProcessing(true);
    setError('');
    setMessage('');
    const res = await api.post('/api/attendance/scan', { qrPayload });
    if (res.error) {
      setError(res.error.message);
    } else {
      const data = res.data as { message: string };
      setMessage(data.message);
      loadStatus();
      loadRecords();
    }
    setProcessing(false);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', {
      month: 'short', day: 'numeric', weekday: 'short',
    });

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return isNp ? `${h} ${h > 0 ? 'घण्टा' : ''} ${m} मिनेट` : `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-xl">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {isNp ? 'मेरो उपस्थिति' : 'My Attendance'}
                </h1>
                <p className="text-xs text-gray-500">{user.firstName} {user.lastName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/my-info')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-gray-400 hover:text-slate-700"
                title={isNp ? 'मेरो विवरण' : 'My Info'}
              >
                <CreditCard className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/leaves')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-gray-400 hover:text-slate-700"
                title={isNp ? 'बिदा' : 'Leaves'}
              >
                <CalendarDays className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <button onClick={() => setError('')}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 text-sm">{message}</span>
            </div>
            <button onClick={() => setMessage('')}><X className="w-4 h-4 text-green-400" /></button>
          </div>
        )}

        {/* Status Card */}
        <div className={`rounded-xl shadow-lg overflow-hidden ${
          status?.isClockedIn
            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}>
          <div className="p-8 text-center">
            {status?.isClockedIn ? (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <p className="text-xl font-bold text-white">
                  {isNp ? 'चेक इन भएको' : 'Clocked In'}
                </p>
                <p className="text-white/80 text-sm mt-1">
                  {isNp ? 'देखि' : 'Since'} {status.record ? formatTime(status.record.checkInTime) : ''}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-5 py-3 rounded-xl">
                  <Timer className="w-5 h-5 text-white" />
                  <span className="text-2xl font-bold text-white">{status.currentDuration?.formatted}</span>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/60 rounded-full mb-4">
                  <Clock className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl font-bold text-gray-700">
                  {isNp ? 'चेक इन भएको छैन' : 'Not Clocked In'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {isNp ? 'चेक इन गर्न QR कोड स्क्यान गर्नुहोस्' : 'Scan QR code to clock in'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Scanner Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 text-center mb-4">
              {status?.isClockedIn
                ? isNp ? 'चेक आउट गर्न स्क्यान गर्नुहोस्' : 'Scan to Clock Out'
                : isNp ? 'चेक इन गर्न स्क्यान गर्नुहोस्' : 'Scan to Clock In'}
            </h2>

            {processing ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto" />
                <p className="mt-4 text-gray-500">{isNp ? 'प्रशोधन हुँदैछ...' : 'Processing...'}</p>
              </div>
            ) : (
              <div className={`w-full flex flex-col items-center gap-3 py-10 rounded-xl border-2 border-dashed ${
                status?.isClockedIn
                  ? 'border-orange-300 bg-orange-50/50'
                  : 'border-green-300 bg-green-50/50'
              }`}>
                <div className={`p-4 rounded-full ${status?.isClockedIn ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <Clock className={`w-8 h-8 ${status?.isClockedIn ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <span className={`font-semibold text-lg ${status?.isClockedIn ? 'text-orange-700' : 'text-green-700'}`}>
                  {status?.isClockedIn
                    ? isNp ? 'चेक आउट गर्न QR स्क्यान गर्नुहोस्' : 'Scan QR Code to Check Out'
                    : isNp ? 'चेक इन गर्न QR स्क्यान गर्नुहोस्' : 'Scan QR Code to Check In'}
                </span>
                <p className="text-sm text-gray-500 text-center px-4">
                  {isNp
                    ? 'आफ्नो फोनको क्यामेराले कार्यालयमा राखिएको QR कोड स्क्यान गर्नुहोस्'
                    : 'Use your phone camera to scan the QR code posted at your office'}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/leaves')}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-2 bg-slate-100 rounded-lg">
              <CalendarDays className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'बिदा माग्नुहोस्' : 'Request Leave'}
            </span>
          </button>
          <button
            onClick={() => router.push('/my-info')}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'मेरो विवरण' : 'My Info'}
            </span>
          </button>
          <button
            onClick={() => router.push('/employee/attendance')}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all col-span-2"
          >
            <div className="p-2 bg-violet-100 rounded-lg">
              <BarChart2 className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'उपस्थिति इतिहास' : 'Attendance History'}
            </span>
          </button>
          <button
            onClick={() => router.push('/employee/my-salary')}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all col-span-2"
          >
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isNp ? 'मेरो तलब' : 'My Salary & Payslips'}
            </span>
          </button>
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {isNp ? 'हालको इतिहास' : 'Recent History'}
            </h2>
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{formatDate(record.checkInTime)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(record.checkInTime)}
                      {record.checkOutTime && <> → {formatTime(record.checkOutTime)}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'CHECKED_IN'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {record.status === 'CHECKED_IN'
                        ? isNp ? 'सक्रिय' : 'Active'
                        : isNp ? 'पूरा' : 'Done'}
                    </span>
                    {record.duration && (
                      <p className="text-xs text-gray-500 mt-1">{formatDuration(record.duration)}</p>
                    )}
                  </div>
                </div>
              ))}
              {records.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    {isNp ? 'अहिलेसम्म कुनै रेकर्ड छैन' : 'No records yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PoweredBy />
    </div>
  );
}