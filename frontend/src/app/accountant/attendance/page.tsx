'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AccountantLayout from '@/components/AccountantLayout';
import BSDatePicker, { adToBS, BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits } from '@/components/BSDatePicker';
import {
  Clock, RefreshCw, X, AlertCircle, CheckCircle,
  Save, Lock, Filter, CheckSquare,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
  status: string;
  isManualEntry?: boolean;
  modificationNote?: string | null;
  originalCheckOut?: string | null;
  reviewedByAccountant: boolean;
  reviewedAt: string | null;
  user: { firstName: string; lastName: string; employeeId: string };
}

const STATUS_COLORS: Record<string, string> = {
  CHECKED_IN:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  CHECKED_OUT: 'bg-sky-100 text-sky-700 border-sky-200',
  AUTO_CLOSED: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function AccountantAttendancePage() {
  const { language, calendarMode } = useAuth();
  const isNp = language === 'NEPALI';
  const isBs = calendarMode === 'NEPALI';

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filterAutoOnly, setFilterAutoOnly] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit modal state
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ checkOutTime: '', note: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Acknowledge state
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);

  const loadRecords = useCallback(async (date: string) => {
    setLoading(true);
    const res = await api.get('/api/attendance?date=' + date);
    if (res.data) {
      setRecords((res.data as { records: AttendanceRecord[] }).records);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords(selectedDate);
  }, [selectedDate, loadRecords]);

  useEffect(() => {
    const interval = setInterval(() => loadRecords(selectedDate), 60000);
    return () => clearInterval(interval);
  }, [selectedDate, loadRecords]);

  const toLocalDatetimeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return isNp ? `${h} घण्टा ${m} मि` : `${h}h ${m}m`;
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isBs) {
      const bs = adToBS(d);
      return isNp
        ? `${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.day)}`
        : `${BS_MONTHS_EN[bs.month - 1]} ${bs.day}`;
    }
    return d.toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditForm({
      checkOutTime: record.checkOutTime ? toLocalDatetimeStr(record.checkOutTime) : '',
      note: '',
    });
    setError('');
  };

  const submitEdit = async () => {
    if (!editRecord) return;
    if (!editForm.note || editForm.note.length < 3) {
      setError(isNp ? 'कारण आवश्यक छ (कम्तिमा ३ अक्षर)' : 'Reason is required (min 3 characters)');
      return;
    }
    if (!editForm.checkOutTime) {
      setError(isNp ? 'चेकआउट समय आवश्यक छ' : 'Check-out time is required');
      return;
    }
    setEditSaving(true);
    const res = await api.put('/api/attendance/' + editRecord.id + '/edit', {
      checkOutTime: new Date(editForm.checkOutTime).toISOString(),
      note: editForm.note,
    });
    setEditSaving(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNp ? 'रेकर्ड अपडेट भयो' : 'Record updated successfully');
      setEditRecord(null);
      loadRecords(selectedDate);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const acknowledgeRecord = async (id: string) => {
    setAcknowledgingId(id);
    const res = await api.put('/api/attendance/' + id + '/acknowledge', {});
    setAcknowledgingId(null);
    if (res.error) {
      setError(res.error.message);
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, reviewedByAccountant: true, reviewedAt: new Date().toISOString() } : r
        )
      );
      setSuccess(isNp ? 'रेकर्ड स्वीकृत गरियो' : 'Record acknowledged');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const acknowledgeAll = async () => {
    const unreviewed = records.filter(
      (r) => r.status === 'AUTO_CLOSED' && !r.reviewedByAccountant
    );
    if (unreviewed.length === 0) return;
    setBulkAcknowledging(true);
    let successCount = 0;
    for (const r of unreviewed) {
      const res = await api.put('/api/attendance/' + r.id + '/acknowledge', {});
      if (!res.error) successCount++;
    }
    setBulkAcknowledging(false);
    await loadRecords(selectedDate);
    setSuccess(
      isNp
        ? `${successCount} रेकर्डहरू स्वीकृत गरियो`
        : `${successCount} record${successCount === 1 ? '' : 's'} acknowledged`
    );
    setTimeout(() => setSuccess(''), 3000);
  };

  const displayedRecords = filterAutoOnly
    ? records.filter((r) => r.status === 'AUTO_CLOSED')
    : records;

  const autoClosedCount = records.filter((r) => r.status === 'AUTO_CLOSED').length;
  const unreviewedCount = records.filter((r) => r.status === 'AUTO_CLOSED' && !r.reviewedByAccountant).length;

  return (
    <AccountantLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'उपस्थिति रेकर्ड' : 'Attendance records'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp
                ? 'AUTO_CLOSED रेकर्डहरू समीक्षा र स्वीकृत गर्नुहोस्'
                : 'Review and acknowledge AUTO_CLOSED records'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isBs ? (
              <div className="w-56">
                <BSDatePicker value={selectedDate} onChange={(adDateStr) => setSelectedDate(adDateStr)} />
              </div>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            )}
            <button
              onClick={() => setFilterAutoOnly(!filterAutoOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                filterAutoOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              {isNp ? 'AUTO_CLOSED मात्र' : 'AUTO_CLOSED only'}
              {autoClosedCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {autoClosedCount}
                </span>
              )}
            </button>
            {unreviewedCount > 0 && (
              <button
                onClick={acknowledgeAll}
                disabled={bulkAcknowledging}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <CheckSquare className="w-4 h-4" />
                {bulkAcknowledging
                  ? (isNp ? 'स्वीकृत गर्दै...' : 'Acknowledging...')
                  : (isNp ? `सबै स्वीकृत (${unreviewedCount})` : `Acknowledge all (${unreviewedCount})`)}
              </button>
            )}
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => loadRecords(selectedDate)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Accountant notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            {isNp
              ? 'लेखापालले AUTO_CLOSED रेकर्डहरूको check-out समय सच्याउन र स्वीकृत गर्न सक्छन्। एकपटक स्वीकृत भएपछि सम्पादन बन्द हुन्छ। प्रशासकले मात्र पुनः सम्पादन गर्न सक्छन्।'
              : 'Accountants can correct check-out times and acknowledge AUTO_CLOSED records. Once acknowledged, the record is locked for accountants. Only the admin can edit after acknowledgement.'}
          </p>
        </div>

        {/* Records table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">
                {filterAutoOnly
                  ? (isNp ? 'यस मितिमा AUTO_CLOSED रेकर्ड छैन' : 'No AUTO_CLOSED records for this date')
                  : (isNp ? 'यस मितिमा कुनै रेकर्ड छैन' : 'No records for this date')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {[
                      isNp ? 'कर्मचारी' : 'Employee',
                      isNp ? 'मिति' : 'Date',
                      isNp ? 'आगमन' : 'Check In',
                      isNp ? 'प्रस्थान' : 'Check Out',
                      isNp ? 'अवधि' : 'Duration',
                      isNp ? 'स्थिति' : 'Status',
                      isNp ? 'कार्य' : 'Actions',
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${
                          i === 0 ? 'text-left' : i === 6 ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRecords.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        r.reviewedByAccountant ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {r.user.firstName} {r.user.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{r.user.employeeId}</div>
                        {r.modificationNote && (
                          <div className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-[180px]" title={r.modificationNote}>
                            ✎ {r.modificationNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDateDisplay(r.checkInTime)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-900 font-medium">{formatTime(r.checkInTime)}</span>
                      </td>
                      <td className="py-3 px-4">
                        {r.checkOutTime ? (
                          <>
                            <span className="text-slate-900 font-medium">{formatTime(r.checkOutTime)}</span>
                            {r.originalCheckOut && (
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatTime(r.originalCheckOut)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.duration != null ? formatDuration(r.duration) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                            STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {r.status === 'AUTO_CLOSED'
                              ? (isNp ? 'स्वतः बन्द' : 'AUTO CLOSED')
                              : r.status === 'CHECKED_IN'
                              ? (isNp ? 'भित्र छ' : 'CHECKED IN')
                              : r.status === 'CHECKED_OUT'
                              ? (isNp ? 'बाहिर गयो' : 'CHECKED OUT')
                              : r.status}
                          </span>
                          {r.reviewedByAccountant && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3" />
                              {isNp ? 'स्वीकृत' : 'Acknowledged'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'AUTO_CLOSED' ? (
                          r.reviewedByAccountant ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Lock className="w-3 h-3" />
                              {isNp ? 'बन्द' : 'Locked'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(r)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isNp ? 'सच्याउनुहोस्' : 'Correct'}
                              </button>
                              <button
                                onClick={() => acknowledgeRecord(r.id)}
                                disabled={acknowledgingId === r.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                {acknowledgingId === r.id
                                  ? '...'
                                  : (isNp ? 'स्वीकृत' : 'Acknowledge')}
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-300" title={isNp ? 'सम्पादन अनुमति छैन' : 'No edit permission'}>
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'चेकआउट समय सच्याउनुहोस्' : 'Correct check-out time'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editRecord.user.firstName} {editRecord.user.lastName}
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    AUTO_CLOSED
                  </span>
                </p>
              </div>
              <button
                onClick={() => { setEditRecord(null); setError(''); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original check-in — read only for context */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">
                {isNp ? 'चेक इन समय (परिवर्तन हुँदैन)' : 'Check-in time (read only)'}
              </p>
              <p className="text-sm font-medium text-slate-900">{formatTime(editRecord.checkInTime)}</p>
            </div>

            {/* Check-out field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'वास्तविक चेकआउट समय' : 'Actual check-out time'}
                <span className="ml-1 text-xs text-amber-600">
                  ({isNp ? 'सम्पादनयोग्य' : 'editable'})
                </span>
              </label>
              <input
                type="datetime-local"
                value={editForm.checkOutTime}
                onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <p className="text-xs text-amber-600">
                {isNp
                  ? 'यो रेकर्ड स्वतः बन्द भएको थियो। कर्मचारी वास्तवमा गएको समय प्रविष्ट गर्नुहोस्।'
                  : 'This record was auto-closed. Enter the actual time the employee left.'}
              </p>
            </div>

            {/* Reason field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कारण (आवश्यक)' : 'Reason (required)'}
              </label>
              <input
                type="text"
                placeholder={isNp ? 'परिवर्तनको कारण लेख्नुहोस्' : 'Reason for this correction'}
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setEditRecord(null); setError(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={submitEdit}
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editSaving ? (isNp ? 'सेभ...' : 'Saving...') : (isNp ? 'सेभ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </AccountantLayout>
  );
}