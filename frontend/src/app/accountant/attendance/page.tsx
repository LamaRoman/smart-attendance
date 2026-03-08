'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AccountantLayout from '@/components/AccountantLayout';
import { Clock } from 'lucide-react';

export default function AccountantAttendancePage() {
  const { language } = useAuth();
  const isNp = language === 'NEPALI';
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get('/attendance?limit=50&offset=0');
        setRecords((res.data as any)?.data?.records || (res.data as any)?.data || []);
      } catch (err) {
        console.error('Attendance fetch error:', err);
      }
      setLoading(false);
    }
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <AccountantLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        </div>
      </AccountantLayout>
    );
  }

  return (
    <AccountantLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {isNp ? 'उपस्थिति' : 'Attendance'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isNp ? 'कर्मचारी उपस्थिति विवरण (हेर्ने मात्र)' : 'Employee attendance records (view only)'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    {isNp ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    {isNp ? 'चेक इन' : 'Check In'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    {isNp ? 'चेक आउट' : 'Check Out'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    {isNp ? 'अवधि' : 'Duration'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    {isNp ? 'स्थिति' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {isNp ? 'कुनै रेकर्ड भेटिएन' : 'No records found'}
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {r.user?.firstName} {r.user?.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{r.user?.employeeId}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.duration ? `${Math.floor(r.duration / 60)}h ${r.duration % 60}m` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 'CHECKED_OUT' ? 'bg-green-50 text-green-700' :
                          r.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AccountantLayout>
  );
}