'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import BSDatePicker from '@/components/BSDatePicker';
import { Clock, Calendar, RefreshCw, Edit, UserPlus, X, AlertCircle, CheckCircle, Save, Pencil, Lock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
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

export default function AdminAttendancePage() {
  const { user, isLoading, language, features, calendarMode } = useAuth();
  const canManualCorrect = features.manualCorrection;
  const router = useRouter();
  const isNp = language === 'NEPALI';
  const isBs = calendarMode === 'NEPALI';

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', note: '' });

  const [showMarkPresent, setShowMarkPresent] = useState(false);
  const [employees, setEmployees] = useState<UserOption[]>([]);
  const [markForm, setMarkForm] = useState({ userId: '', date: '', checkInTime: '', checkOutTime: '', note: '' });

  const [tooltip, setTooltip] = useState<string | null>(null);
  const [showMarkPresentTooltip, setShowMarkPresentTooltip] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login');
  }, [user, isLoading, router]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/attendance?date=' + selectedDate);
    if (res.data) {
      setRecords((res.data as { records: AttendanceRecord[] }).records);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, [selectedDate]);

  const loadEmployees = async () => {
    const res = await api.get('/api/users');
    if (res.data && Array.isArray(res.data)) {
      setEmployees((res.data as UserOption[]).filter((u: any) => u.role === 'EMPLOYEE' && u.isActive));
    }
  };

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') { loadRecords(); loadEmployees(); }
  }, [user, loadRecords]);

  useEffect(() => {
    if (user?.role !== 'ORG_ADMIN') return;
    const interval = setInterval(loadRecords, 30000);
    return () => clearInterval(interval);
  }, [user, loadRecords]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNp ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric' });

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    return isNp ? h + ' घण्टा ' + m + ' मि' : h + 'h ' + m + 'm';
  };

  const toLocalDatetimeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
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
    const body: any = { note: editForm.note };
    if (editForm.checkInTime) body.checkInTime = new Date(editForm.checkInTime).toISOString();
    if (editForm.checkOutTime) body.checkOutTime = new Date(editForm.checkOutTime).toISOString();
    const res = await api.put('/api/attendance/' + editRecord.id + '/edit', body);
    if (res.error) { setError(res.error.message); }
    else {
      setSuccess(isNp ? 'रेकर्ड अपडेट भयो' : 'Record updated');
      setEditRecord(null);
      loadRecords();
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
    const checkInTime = new Date(markForm.date + 'T' + markForm.checkInTime + ':00').toISOString();
    const checkOutTime = markForm.checkOutTime ? new Date(markForm.date + 'T' + markForm.checkOutTime + ':00').toISOString() : undefined;
    const res = await api.post('/api/attendance/mark-present', {
      userId: markForm.userId, date: markForm.date, checkInTime, checkOutTime, note: markForm.note,
    });
    if (res.error) { setError(res.error.message); }
    else {
      setSuccess(isNp ? 'उपस्थित चिन्ह लगाइयो' : 'Marked as present');
      setShowMarkPresent(false);
      loadRecords();
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'उपस्थिति रेकर्ड' : 'Attendance records'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'वास्तविक समयको उपस्थिति ट्र्याकिङ' : 'Real-time attendance tracking'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date picker */}
            {isBs ? (
              <div className="w-56">
                <BSDatePicker
                  value={selectedDate}
                  onChange={(adDateStr) => setSelectedDate(adDateStr)}
                />
              </div>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            )}

            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button onClick={loadRecords} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 disabled:opacity-50">
              <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>

            {canManualCorrect ? (
              <button onClick={openMarkPresent}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                {isNp ? 'उपस्थित चिन्ह' : 'Mark present'}
              </button>
            ) : (
              <div
                className="relative"
                onMouseEnter={() => setShowMarkPresentTooltip(true)}
                onMouseLeave={() => setShowMarkPresentTooltip(false)}
              >
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">PRO</span>
                  {isNp ? 'उपस्थित चिन्ह' : 'Mark present'}
                </button>
                {showMarkPresentTooltip && (
                  <div className="absolute top-full right-0 mt-2 w-72 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-20">
                    <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900" />
                    {isNp
                      ? 'उपस्थिति त्रुटि सच्याउनुहोस् र छुटेका चेक-इन चिन्ह लगाउनुहोस् — Operations plan'
                      : 'Fix attendance errors and mark missed check-ins — Operations plan'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && !editRecord && !showMarkPresent && (
          <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-500" /><span className="text-xs text-rose-700">{error}</span></div>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5 text-rose-400" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700">{success}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'कर्मचारी' : 'Employee'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'मिति' : 'Date'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'चेक इन' : 'Check in'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'चेक आउट' : 'Check out'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'अवधि' : 'Duration'}</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'स्थिति' : 'Status'}</th>
                  {canManualCorrect && (
                    <th className="text-right py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">{isNp ? 'कार्य' : 'Actions'}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-700">{record.user.firstName?.[0]}{record.user.lastName?.[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{record.user.firstName} {record.user.lastName}</div>
                          <div className="text-xs text-slate-400">{record.user.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-600">{formatDate(record.checkInTime)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-sm font-medium text-slate-900">{formatTime(record.checkInTime)}</div>
                      {record.originalCheckIn && (
                        <div className="text-xs text-amber-600 line-through">{formatTime(record.originalCheckIn)}</div>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      {record.checkOutTime ? (
                        <>
                          <div className="text-sm text-slate-600">{formatTime(record.checkOutTime)}</div>
                          {record.originalCheckOut && (
                            <div className="text-xs text-amber-600 line-through">{formatTime(record.originalCheckOut)}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">{isNp ? 'बाँकी' : '—'}</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      {record.duration ? (
                        <span className="text-sm text-slate-600">{formatDuration(record.duration)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={'inline-block w-1.5 h-1.5 rounded-full ' + (record.checkOutTime ? 'bg-emerald-500' : 'bg-amber-500')} />
                        <span className={'text-xs font-medium ' + (record.checkOutTime ? 'text-emerald-700' : 'text-amber-700')}>
                          {record.checkOutTime ? (isNp ? 'पूरा' : 'Done') : (isNp ? 'सक्रिय' : 'Active')}
                        </span>
                        {record.isManualEntry && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 font-medium">{isNp ? 'म्यानुअल' : 'Manual'}</span>
                        )}
                        {record.modificationNote && !record.isManualEntry && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-600 font-medium cursor-help relative"
                            onMouseEnter={() => setTooltip(record.id)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <Pencil className="w-3 h-3" />{isNp ? 'सम्पादित' : 'Edited'}
                            {tooltip === record.id && (
                              <div className="absolute bottom-full left-0 mb-1 w-56 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-10">
                                {record.modificationNote}
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    {canManualCorrect && (
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => openEdit(record)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan={canManualCorrect ? 7 : 6} className="py-16 px-5 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1">{isNp ? 'कुनै रेकर्ड छैन' : 'No records found'}</p>
                      <p className="text-xs text-slate-500">{isNp ? 'यस मितिको उपस्थिति रेकर्ड छैन' : 'No attendance records for this date'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Time Modal */}
      {editRecord && canManualCorrect && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50"><Pencil className="w-4 h-4 text-amber-600" /></div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{isNp ? 'समय सच्याउनुहोस्' : 'Correct time'}</h2>
                  <p className="text-xs text-slate-400">{editRecord.user.firstName} {editRecord.user.lastName} — {formatDate(editRecord.checkInTime)}</p>
                </div>
              </div>
              <button onClick={() => { setEditRecord(null); setError(''); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /><span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{isNp ? 'चेक इन समय' : 'Check-in time'}</label>
                  <input type="datetime-local" value={editForm.checkInTime} onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{isNp ? 'चेक आउट समय' : 'Check-out time'}</label>
                  <input type="datetime-local" value={editForm.checkOutTime} onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'कारण' : 'Reason for change'} <span className="text-rose-500">*</span>
                </label>
                <textarea value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder={isNp ? 'परिवर्तनको कारण लेख्नुहोस्...' : 'e.g., Employee forgot to scan, verified by supervisor...'}
                  rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
                <p className="text-xs text-slate-400 mt-1">{isNp ? 'यो नोट अडिट ट्रेलमा सुरक्षित हुन्छ' : 'This note is saved in the audit trail'}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setEditRecord(null); setError(''); }}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">{isNp ? 'रद्द' : 'Cancel'}</button>
                <button onClick={submitEdit}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />{isNp ? 'सुरक्षित' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Present Modal */}
      {showMarkPresent && canManualCorrect && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50"><UserPlus className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{isNp ? 'उपस्थित चिन्ह लगाउनुहोस्' : 'Mark employee present'}</h2>
                  <p className="text-xs text-slate-400">{isNp ? 'अनुपस्थित कर्मचारीलाई उपस्थित बनाउनुहोस्' : 'Create attendance record for absent employee'}</p>
                </div>
              </div>
              <button onClick={() => { setShowMarkPresent(false); setError(''); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /><span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'कर्मचारी' : 'Employee'} <span className="text-rose-500">*</span>
                </label>
                <select value={markForm.userId} onChange={(e) => setMarkForm({ ...markForm, userId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                  <option value="">{isNp ? 'कर्मचारी छान्नुहोस्' : 'Select employee'}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{isNp ? 'मिति' : 'Date'} <span className="text-rose-500">*</span></label>
                <input type="date" value={markForm.date} onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{isNp ? 'चेक इन' : 'Check-in'} <span className="text-rose-500">*</span></label>
                  <input type="time" value={markForm.checkInTime} onChange={(e) => setMarkForm({ ...markForm, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{isNp ? 'चेक आउट' : 'Check-out'}</label>
                  <input type="time" value={markForm.checkOutTime} onChange={(e) => setMarkForm({ ...markForm, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'कारण' : 'Reason'} <span className="text-rose-500">*</span>
                </label>
                <textarea value={markForm.note} onChange={(e) => setMarkForm({ ...markForm, note: e.target.value })}
                  placeholder={isNp ? 'कारण लेख्नुहोस्...' : 'e.g., QR scanner was down, employee was present...'}
                  rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
                <p className="text-xs text-slate-400 mt-1">{isNp ? 'यो "म्यानुअल एन्ट्री" चिन्हसहित रेकर्ड हुन्छ' : 'This will be recorded with a "Manual Entry" tag'}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowMarkPresent(false); setError(''); }}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">{isNp ? 'रद्द' : 'Cancel'}</button>
                <button onClick={submitMarkPresent}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />{isNp ? 'उपस्थित चिन्ह' : 'Mark present'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}