'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

export default function AccountantLeavesPage() {
  const { language } = useAuth();
  const isNp = language === 'NEPALI';
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaves() {
      try {
        const res = await api.get('/leaves?limit=50&offset=0');
        setLeaves((res.data as any)?.data?.records || (res.data as any)?.data || []);
      } catch (err) {
        console.error('Leaves fetch error:', err);
      }
      setLoading(false);
    }
    fetchLeaves();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {isNp ? 'बिदा अभिलेख' : 'Leave Records'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isNp ? 'कर्मचारी बिदा विवरण (हेर्ने मात्र)' : 'Employee leave records (view only)'}
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
                  {isNp ? 'प्रकार' : 'Type'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isNp ? 'सुरु मिति' : 'Start Date'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isNp ? 'अन्त्य मिति' : 'End Date'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isNp ? 'स्थिति' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {isNp ? 'कुनै रेकर्ड भेटिएन' : 'No records found'}
                  </td>
                </tr>
              ) : (
                leaves.map((l: any) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">
                        {l.user?.firstName} {l.user?.lastName}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.type}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.startDate ? new Date(l.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.endDate ? new Date(l.endDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[l.status] || 'bg-slate-50 text-slate-600'}`}>
                        {l.status}
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
  );
}