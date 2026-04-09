'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import BSDatePicker, { adToBS, BS_MONTHS_NP, BS_MONTHS_EN, toNepaliDigits } from '@/components/BSDatePicker';
import { Clock, RefreshCw, X, AlertCircle, CheckCircle, Save, UserPlus, Lock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
  status: string;
  isActive: boolean;
  isManualEntry?: boolean;
  modifiedBy?: string | null;
  modificationNote?: string | null;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
  user: { id?: string; firstName: string; lastName: string; employeeId: string };
}

interface UserOption {
  id: string; firstName: string; lastName: string; employeeId: string;
}

const STATUS_COLORS: Record<string, string> = {
  CHECKED_IN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CHECKED_OUT: 'bg-sky-100 text-sky-700 border-sky-200',
  AUTO_CLOSED: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function AdminAttendancePage() {
  const { user, isLoading, language, features, calendarMode } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';
  const isBs = calendarMode === 'NEPALI';

  // Role flags
  const isAdmin = user?.role === 'ORG_ADMIN';
  const isAccountant = user?.role === 'ORG_ACCOUNTANT';

  // ORG_ADMIN with manualCorrection feature: full edit + mark present
  const canManualCorrect = isAdmin && features?.manualCorrection;
  // Accountant can edit checkOutTime on AUTO_CLOSED records only (no feature flag needed)
  const canEditAutoClose = isAccountant;

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', note: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [showMarkPresent, setShowMarkPresent] = useState(false);
  const [employees, setEmployees] = useState<UserOption[]>([]);
  const [markForm, setMarkForm] = useState({ userId: '', date: '', checkInTime: '', checkOutTime: '', note: '' });
  const [markSaving, setMarkSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'ORG_ACCOUNTANT'))) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadRecords = useCallback(async (date: string) => {
    setLoading(true);
    const res = await api.get('/api/v1/attendance?date=' + date);
    if (res.data) {
      setRecords((res.data as { records: AttendanceRecord[] }).records);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, []);

  const loadEmployees = useCallback(async () => {
    const res = await api.get('/api/v1/users');
    if (res.data && Array.isArray(res.data)) {
      setEmployees((res.data as any[]).filter((u) => u.role === 'EMPLOYEE' && u.isActive));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN' || user?.role === 'ORG_ACCOUNTANT') {
      loadRecords(selectedDate);
      if (isAdmin) loadEmployees();
    }
  }, [user, selectedDate, loadRecords, loadEmployees, isAdmin]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'ORG_ACCOUNTANT')) return;
    const interval = setInterval(() => loadRecords(selectedDate), 30000);
    return () => clearInterval(interval);
  }, [user, selectedDate, loadRecords]);

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

  const toLocalDatetimeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Determine if a record is editable by the current user
  const canEditRecord = (record: AttendanceRecord): boolean => {
    if (canManualCorrect) return true;
    if (canEditAutoClose && record.status === 'AUTO_CLOSED') return true;
    return false;
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditForm({
      checkInTime: toLocalDatetimeStr(record.checkInTime),
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
    setEditSaving(true);
    const body: any = { note: editForm.note };
    // Accountants can only send checkOutTime — checkInTime is hidden for them
    if (isAdmin && editForm.checkInTime) {
      body.checkInTime = new Date(editForm.checkInTime).toISOString();
    }
    if (editForm.checkOutTime) {
      body.checkOutTime = new Date(editForm.checkOutTime).toISOString();
    }
    const res = await api.put('/api/v1/attendance/' + editRecord.id + '/edit', body);
    setEditSaving(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNp ? 'रेकर्ड अपडेट भयो' : 'Record updated');
      setEditRecord(null);
      loadRecords(selectedDate);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const openMarkPresent = () => {
    setMarkForm({ userId: '', date: selectedDate, checkInTime: '10:00', checkOutTime: '18:00', note: '' });
    setShowMarkPresent(true);
    setError('');
  };

  const submitMarkPresent = async () => {
    if (!markForm.userId || !markForm.date || !markForm.checkInTime || !markForm.note) {
      setError(isNp ? 'सबै फिल्ड भर्नुहोस्' : 'All fields are required');
      return;
    }
    if (markForm.note.length < 3) {
      setError(isNp ? 'कारण आवश्यक छ (कम्तिमा ३ अक्षर)' : 'Reason is required (min 3 characters)');
      return;
    }
    setMarkSaving(true);
    const checkInTime = new Date(markForm.date + 'T' + markForm.checkInTime + ':00').toISOString();
    const checkOutTime = markForm.checkOutTime
      ? new Date(markForm.date + 'T' + markForm.checkOutTime + ':00').toISOString()
      : undefined;
    const res = await api.post('/api/v1/attendance/mark-present', {
      userId: markForm.userId, date: markForm.date, checkInTime, checkOutTime, note: markForm.note,
    });
    setMarkSaving(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNp ? 'उपस्थित चिन्ह लगाइयो' : 'Marked as present');
      setShowMarkPresent(false);
      loadRecords(selectedDate);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const showActionsColumn = canManualCorrect || canEditAutoClose;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'उपस्थिति रेकर्ड' : 'Attendance records'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'वास्तविक समयको उपस्थिति ट्र्याकिङ' : 'Real-time attendance tracking'}
              {isAccountant && (
                <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs border border-amber-200">
                  {isNp ? 'लेखापाल दृश्य' : 'Accountant view'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isBs ? (
              <div className="w-56">
                <BSDatePicker value={selectedDate} onChange={(adDateStr) => setSelectedDate(adDateStr)} />
              </div>
            ) : (
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
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
            {/* Mark Present — admin only */}
            {canManualCorrect && (
              <button
                onClick={openMarkPresent}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {isNp ? 'उपस्थित चिन्ह लगाउनुहोस्' : 'Mark present'}
              </button>
            )}
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
        {isAccountant && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              {isNp
                ? 'लेखापालले AUTO_CLOSED रेकर्डहरूको check-out समय मात्र सम्पादन गर्न सक्छन्। अन्य रेकर्डहरू संगठन प्रशासकद्वारा मात्र सम्पादन गर्न सकिन्छ।'
                : 'Accountants can only edit the check-out time of AUTO_CLOSED records. Other records can only be edited by the organization admin.'}
            </p>
          </div>
        )}

        {/* Records table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{isNp ? 'यस मितिमा कुनै रेकर्ड छैन' : 'No records for this date'}</p>
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
                      ...(showActionsColumn ? [isNp ? 'कार्य' : 'Actions'] : []),
                    ].map((h, i) => (
                      <th key={i} className={`py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider ${i === 0 ? 'text-left' : i === (showActionsColumn ? 6 : 5) ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const editAllowed = canEditRecord(r);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{r.user.firstName} {r.user.lastName}</div>
                          <div className="text-xs text-slate-400">{r.user.employeeId}</div>
                          {r.isManualEntry && (
                            <span className="text-[10px] text-violet-600 font-medium">
                              {isNp ? 'म्यानुअल प्रविष्टि' : 'Manual entry'}
                            </span>
                          )}
                          {r.modificationNote && (
                            <div className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-[180px]" title={r.modificationNote}>
                              ✎ {r.modificationNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDateDisplay(r.checkInTime)}</td>
                        <td className="py-3 px-4">
                          <span className="text-slate-900 font-medium">{formatTime(r.checkInTime)}</span>
                          {r.originalCheckIn && (
                            <div className="text-[10px] text-slate-400 line-through">{formatTime(r.originalCheckIn)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.checkOutTime ? (
                            <>
                              <span className="text-slate-900 font-medium">{formatTime(r.checkOutTime)}</span>
                              {r.originalCheckOut && (
                                <div className="text-[10px] text-slate-400 line-through">{formatTime(r.originalCheckOut)}</div>
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {r.status === 'AUTO_CLOSED' ? (isNp ? 'स्वतः बन्द' : 'AUTO CLOSED') :
                             r.status === 'CHECKED_IN' ? (isNp ? 'भित्र छ' : 'CHECKED IN') :
                             r.status === 'CHECKED_OUT' ? (isNp ? 'बाहिर गयो' : 'CHECKED OUT') : r.status}
                          </span>
                        </td>
                        {showActionsColumn && (
                          <td className="py-3 px-4 text-center">
                            {editAllowed ? (
                              <button
                                onClick={() => openEdit(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                title={isAccountant ? (isNp ? 'check-out समय सम्पादन' : 'Edit check-out time') : (isNp ? 'सम्पादन' : 'Edit')}
                              >
                                <Save className="w-3.5 h-3.5" />
                                {isNp ? 'सम्पादन' : 'Edit'}
                                {isAccountant && (
                                  <span className="ml-0.5 text-amber-500 text-[10px]">check-out</span>
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-300" title={isNp ? 'सम्पादन अनुमति छैन' : 'No edit permission'}>
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'रेकर्ड सम्पादन' : 'Edit attendance record'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editRecord.user.firstName} {editRecord.user.lastName}
                  {editRecord.status === 'AUTO_CLOSED' && (
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">AUTO_CLOSED</span>
                  )}
                </p>
              </div>
              <button onClick={() => setEditRecord(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Accountant restriction notice */}
            {isAccountant && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {isNp
                    ? 'लेखापालले check-out समय मात्र परिवर्तन गर्न सक्छन्।'
                    : 'Accountants can only change the check-out time.'}
                </p>
              </div>
            )}

            {/* Check-in field — admin only */}
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isNp ? 'आगमन समय' : 'Check-in time'}
                </label>
                <input
                  type="datetime-local"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            )}

            {/* Check-out field — both admin and accountant */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'प्रस्थान समय' : 'Check-out time'}
                {isAccountant && <span className="ml-1 text-xs text-slate-400">{isNp ? '(सम्पादनयोग्य)' : '(editable)'}</span>}
              </label>
              <input
                type="datetime-local"
                value={editForm.checkOutTime}
                onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              {editRecord.status === 'AUTO_CLOSED' && (
                <p className="text-xs text-amber-600">
                  {isNp
                    ? 'यो रेकर्ड स्वतः बन्द भएको थियो। वास्तविक प्रस्थान समय प्रविष्ट गर्नुहोस्।'
                    : 'This record was auto-closed. Enter the actual time the employee left.'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कारण (आवश्यक)' : 'Reason (required)'}
              </label>
              <input
                type="text"
                placeholder={isNp ? 'परिवर्तनको कारण लेख्नुहोस्' : 'Reason for this change'}
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

      {/* ===== MARK PRESENT MODAL (admin only) ===== */}
      {showMarkPresent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isNp ? 'उपस्थित चिन्ह लगाउनुहोस्' : 'Mark employee as present'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isNp ? 'अनुपस्थित कर्मचारीको रेकर्ड थप्नुहोस्' : 'Add attendance record for absent employee'}
                </p>
              </div>
              <button onClick={() => setShowMarkPresent(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{isNp ? 'कर्मचारी' : 'Employee'}</label>
              <select
                value={markForm.userId}
                onChange={(e) => setMarkForm({ ...markForm, userId: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              >
                <option value="">{isNp ? 'कर्मचारी छान्नुहोस्' : 'Select employee'}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} {e.employeeId ? `(${e.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{isNp ? 'मिति' : 'Date'}</label>
              <input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{isNp ? 'आगमन समय' : 'Check-in'}</label>
                <input
                  type="time"
                  value={markForm.checkInTime}
                  onChange={(e) => setMarkForm({ ...markForm, checkInTime: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isNp ? 'प्रस्थान समय' : 'Check-out'}
                  <span className="ml-1 text-xs text-slate-400">{isNp ? '(ऐच्छिक)' : '(optional)'}</span>
                </label>
                <input
                  type="time"
                  value={markForm.checkOutTime}
                  onChange={(e) => setMarkForm({ ...markForm, checkOutTime: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isNp ? 'कारण (आवश्यक)' : 'Reason (required)'}
              </label>
              <input
                type="text"
                placeholder={isNp ? 'किन उपस्थित चिन्ह लगाउँदै हुनुहुन्छ?' : 'Why are you marking this employee present?'}
                value={markForm.note}
                onChange={(e) => setMarkForm({ ...markForm, note: e.target.value })}
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
                onClick={() => { setShowMarkPresent(false); setError(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                onClick={submitMarkPresent}
                disabled={markSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {markSaving ? (isNp ? 'सेभ...' : 'Saving...') : (isNp ? 'सेभ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}