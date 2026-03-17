'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import BSDatePicker, { toNepaliDigits, BS_MONTHS_NP, BS_MONTHS_EN } from '@/components/BSDatePicker';
import AdminLayout from '@/components/AdminLayout';
import AccountantLayout from '@/components/AccountantLayout';
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowLeft,
  LogOut,
  Filter,
  Trash2,
  X,
  RefreshCw,
  Thermometer,
  Umbrella,
  Sun,
  Ban,
  Baby,
  User,
  Search,
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  bsStartYear: number;
  bsStartMonth: number;
  bsStartDay: number;
  bsEndYear: number;
  bsEndMonth: number;
  bsEndDay: number;
  reason: string;
  type: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  durationDays: number;
  rejectionMessage?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
  };
  approver?: {
    firstName: string;
    lastName: string;
  } | null;
}

const LEAVE_TYPES = [
  { value: 'SICK',      label: 'बिरामी बिदा',      labelEn: 'Sick Leave',      icon: Thermometer, accent: 'border-l-rose-400',   iconColor: 'text-rose-500'   },
  { value: 'CASUAL',    label: 'आकस्मिक बिदा',     labelEn: 'Casual Leave',    icon: Umbrella,    accent: 'border-l-blue-400',   iconColor: 'text-blue-500'   },
  { value: 'ANNUAL',    label: 'वार्षिक बिदा',      labelEn: 'Annual Leave',    icon: Sun,         accent: 'border-l-amber-400',  iconColor: 'text-amber-500'  },
  { value: 'UNPAID',    label: 'बिना तलब बिदा',    labelEn: 'Unpaid Leave',    icon: Ban,         accent: 'border-l-slate-400',  iconColor: 'text-slate-500'  },
  { value: 'MATERNITY', label: 'प्रसूति बिदा',      labelEn: 'Maternity Leave', icon: Baby,        accent: 'border-l-pink-400',   iconColor: 'text-pink-500'   },
  { value: 'PATERNITY', label: 'पितृत्व बिदा',      labelEn: 'Paternity Leave', icon: User,        accent: 'border-l-cyan-400',   iconColor: 'text-cyan-500'   },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle; label: string; labelNp: string }> = {
  PENDING:  { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: Clock,         label: 'Pending',  labelNp: 'विचाराधीन' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, label: 'Approved', labelNp: 'स्वीकृत'   },
  REJECTED: { color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',     icon: XCircle,       label: 'Rejected', labelNp: 'अस्वीकृत'  },
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-lg bg-${color.split('-')[1]}-50`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    <div>
      <div className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{title}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
    </div>
  </div>
);

export default function LeavePage() {
  const { user, isLoading, logout, isAdmin, isAccountant, calendarMode, language } = useAuth();
  const router = useRouter();
  const isNepali = language === 'NEPALI';
  const isNepaliCalendar = calendarMode === 'NEPALI';
  const isStaff = isAdmin || isAccountant;

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [showModal, setShowModal] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '', type: 'CASUAL' });

  // ── Filter state ─────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterBsYear, setFilterBsYear] = useState<string>('');
  const [filterBsMonth, setFilterBsMonth] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasActiveFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchDebounced || filterBsYear || filterBsMonth;

  const clearAllFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSearchQuery('');
    setSearchDebounced('');
    setFilterBsYear('');
    setFilterBsMonth('');
  };

  useEffect(() => {
    if (!isLoading && user && isStaff) setActiveTab('all');
  }, [user, isLoading, isStaff]);

  const loadMyLeaves = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/leaves/my?limit=50');
    if (res.data) {
      const data = res.data as { leaves: LeaveRequest[] };
      setMyLeaves(data.leaves);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, []);

  const loadAllLeaves = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (typeFilter !== 'ALL') params.set('type', typeFilter);
    if (searchDebounced) params.set('search', searchDebounced);
    if (filterBsYear) params.set('bsYear', filterBsYear);
    if (filterBsMonth) params.set('bsMonth', filterBsMonth);

    const res = await api.get(`/api/leaves?${params.toString()}`);
    if (res.data) {
      const data = res.data as { leaves: LeaveRequest[] };
      setLeaves(data.leaves);
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, [statusFilter, typeFilter, searchDebounced, filterBsYear, filterBsMonth]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const checkRes = await api.get(isStaff ? '/api/leaves?limit=1' : '/api/leaves/my?limit=1');
      if (
        checkRes.error?.code === 'FEATURE_NOT_AVAILABLE' ||
        checkRes.error?.code === 'NO_SUBSCRIPTION' ||
        checkRes.error?.code === 'SUBSCRIPTION_INACTIVE'
      ) return;
      if (isStaff) { loadAllLeaves(); }
      else { loadMyLeaves(); }
    })();
  }, [user, isStaff, loadAllLeaves, loadMyLeaves]);

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setError(isNepali ? 'कृपया सबै फिल्ड भर्नुहोस्' : 'Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    const res = await api.post('/api/leaves', formData);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNepali ? 'बिदा अनुरोध सफलतापूर्वक पेश गरियो' : 'Leave request submitted successfully');
      setShowModal(false);
      setFormData({ startDate: '', endDate: '', reason: '', type: 'CASUAL' });
      if (isStaff) { loadAllLeaves(); } else { loadMyLeaves(); }
      setTimeout(() => setSuccess(''), 3000);
    }
    setLoading(false);
  };

  const handleCancel = async (leaveId: string) => {
    if (!confirm(isNepali ? 'के तपाईं यो बिदा अनुरोध रद्द गर्न चाहनुहुन्छ?' : 'Cancel this leave request?')) return;
    const res = await api.delete(`/api/leaves/${leaveId}`);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNepali ? 'बिदा अनुरोध रद्द गरियो' : 'Leave request cancelled');
      if (isStaff) { loadAllLeaves(); } else { loadMyLeaves(); }
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleStatusUpdate = async (leaveId: string, status: 'APPROVED' | 'REJECTED', message?: string) => {
    const res = await api.put(`/api/leaves/${leaveId}/status`, { status, ...(message ? { rejectionMessage: message } : {}) });
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(
        isNepali
          ? `बिदा ${status === 'APPROVED' ? 'स्वीकृत' : 'अस्वीकृत'} गरियो`
          : `Leave ${status.toLowerCase()} successfully`
      );
      loadAllLeaves();
      if (!isStaff) loadMyLeaves();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const formatBSDate = (year: number, month: number, day: number) => {
    if (isNepali) return `${toNepaliDigits(year)} ${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(day)}`;
    return `${year}/${month}/${day} (${BS_MONTHS_EN[month - 1]})`;
  };

  const formatADDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isNepali ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatDateDisplay = (leave: LeaveRequest) => {
    if (isNepaliCalendar) {
      const start = formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay);
      const end   = formatBSDate(leave.bsEndYear,   leave.bsEndMonth,   leave.bsEndDay);
      return { primary: `${start} → ${end}`, secondary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}` };
    }
    return {
      primary: `${formatADDate(leave.startDate)} → ${formatADDate(leave.endDate)}`,
      secondary: `BS: ${formatBSDate(leave.bsStartYear, leave.bsStartMonth, leave.bsStartDay)} → ${formatBSDate(leave.bsEndYear, leave.bsEndMonth, leave.bsEndDay)}`,
    };
  };

  const getLeaveTypeConfig = (type: string) => LEAVE_TYPES.find((t) => t.value === type) || LEAVE_TYPES[1];

  const getDurationDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    return Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // BS year options for filter dropdown
  const bsYearOptions = Array.from({ length: 10 }, (_, i) => 2078 + i);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const pendingCount  = (activeTab === 'all' && isStaff ? leaves : myLeaves).filter((l) => l.status === 'PENDING').length;
  const approvedCount = (activeTab === 'all' && isStaff ? leaves : myLeaves).filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = (activeTab === 'all' && isStaff ? leaves : myLeaves).filter((l) => l.status === 'REJECTED').length;
  const totalDaysUsed = myLeaves.filter((l) => l.status === 'APPROVED').reduce((sum, l) => sum + l.durationDays, 0);
  const displayLeaves = activeTab === 'my' ? myLeaves : leaves;

  const pageContent = (
    <div className={isStaff ? '' : 'min-h-screen bg-white flex flex-col'}>

      {/* Header — only for employees (admin/accountant use their sidebar layout) */}
      {!isStaff && (
        <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(isAdmin ? '/admin' : isAccountant ? '/accountant' : '/employee')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <CalendarDays className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-slate-900">
                      {isNepali ? 'बिदा व्यवस्थापन' : 'Leave management'}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {user.firstName} {user.lastName} •{' '}
                      {user.role === 'ORG_ADMIN'
                        ? isNepali ? 'प्रशासक' : 'Admin'
                        : user.role === 'ORG_ACCOUNTANT'
                          ? isNepali ? 'लेखापाल' : 'Accountant'
                          : isNepali ? 'कर्मचारी' : 'Employee'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lastRefreshed && (
                  <span className="text-xs text-slate-400">
                    {isNepali ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                    {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  onClick={() => loadMyLeaves()}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {isNepali ? 'रिफ्रेश' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
                </button>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Page title + refresh for admin/accountant */}
        {isStaff && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {isNepali ? 'बिदा व्यवस्थापन' : 'Leave management'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isNepali ? 'कर्मचारीहरूका बिदा अनुरोधहरू' : 'Employee leave requests'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-slate-400">
                  {isNepali ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                  {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => loadAllLeaves()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {isNepali ? 'रिफ्रेश' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center justify-between p-3.5 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-2.5 p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title={isNepali ? 'विचाराधीन' : 'Pending'}  value={pendingCount}  icon={Clock}         color="text-amber-600"  />
          <StatCard title={isNepali ? 'स्वीकृत'   : 'Approved'} value={approvedCount} icon={CheckCircle}   color="text-emerald-600" />
          <StatCard title={isNepali ? 'अस्वीकृत'  : 'Rejected'} value={rejectedCount} icon={XCircle}       color="text-rose-600"   />
          {!isStaff && (
            <StatCard
              title={isNepali ? 'प्रयोग भएका दिन' : 'Days used'}
              value={isNepali ? toNepaliDigits(totalDaysUsed) : totalDaysUsed}
              icon={Calendar}
              color="text-slate-900"
              subtitle={isNepali ? 'स्वीकृत बिदाहरू' : 'Approved leaves'}
            />
          )}
        </div>

        {/* Tabs & Filters — admin and accountant */}
        {isStaff && (
          <div className="mb-6 space-y-4">
            {/* Top row: tabs + filter toggle */}
            <div className="flex items-center justify-between">
              <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {isNepali ? 'सबै अनुरोधहरू' : 'All requests'}
                  {leaves.filter((l) => l.status === 'PENDING').length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full">
                      {leaves.filter((l) => l.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              </div>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      showFilters || hasActiveFilters
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {isNepali ? 'फिल्टर' : 'Filters'}
                    {hasActiveFilters && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white text-slate-900 rounded-full">
                        {[statusFilter !== 'ALL', typeFilter !== 'ALL', searchDebounced, filterBsYear, filterBsMonth].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200"
                    >
                      <X className="w-3 h-3" />
                      {isNepali ? 'सबै हटाउनुहोस्' : 'Clear all'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Filter panel — expandable */}
            {activeTab === 'all' && showFilters && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                {/* Row 1: Search + Status + Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      {isNepali ? 'कर्मचारी खोज्नुहोस्' : 'Search employee'}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isNepali ? 'नाम वा कर्मचारी ID...' : 'Name or Employee ID...'}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => { setSearchQuery(''); setSearchDebounced(''); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      {isNepali ? 'स्थिति' : 'Status'}
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                    >
                      <option value="ALL">{isNepali ? 'सबै स्थिति' : 'All status'}</option>
                      <option value="PENDING">{isNepali ? 'विचाराधीन' : 'Pending'}</option>
                      <option value="APPROVED">{isNepali ? 'स्वीकृत' : 'Approved'}</option>
                      <option value="REJECTED">{isNepali ? 'अस्वीकृत' : 'Rejected'}</option>
                    </select>
                  </div>

                  {/* Leave Type */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      {isNepali ? 'बिदाको प्रकार' : 'Leave type'}
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                    >
                      <option value="ALL">{isNepali ? 'सबै प्रकार' : 'All types'}</option>
                      {LEAVE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {isNepali ? t.label : t.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: BS Year + BS Month */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      {isNepali ? 'वि.सं. वर्ष' : 'BS Year'}
                    </label>
                    <select
                      value={filterBsYear}
                      onChange={(e) => setFilterBsYear(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                    >
                      <option value="">{isNepali ? 'सबै वर्ष' : 'All years'}</option>
                      {bsYearOptions.map((y) => (
                        <option key={y} value={y}>
                          {isNepali ? toNepaliDigits(y) : y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      {isNepali ? 'महिना' : 'BS Month'}
                    </label>
                    <select
                      value={filterBsMonth}
                      onChange={(e) => setFilterBsMonth(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                    >
                      <option value="">{isNepali ? 'सबै महिना' : 'All months'}</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {isNepali ? BS_MONTHS_NP[m - 1] : BS_MONTHS_EN[m - 1]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    {/* Spacer or future date range filters */}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave List */}
        <div className="space-y-4">
          {displayLeaves.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                {hasActiveFilters
                  ? isNepali ? 'कुनै परिणाम भेटिएन' : 'No results found'
                  : isNepali ? 'कुनै बिदा अनुरोध छैन' : 'No leave requests'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {hasActiveFilters
                  ? isNepali ? 'फिल्टर परिवर्तन गरी पुनः प्रयास गर्नुहोस्।' : 'Try adjusting your filters.'
                  : activeTab === 'my'
                    ? isNepali ? 'तपाईंले अहिलेसम्म कुनै बिदा माग्नुभएको छैन।' : "You haven't requested any leaves yet."
                    : isNepali ? 'कर्मचारीहरूबाट कुनै बिदा अनुरोध छैन।' : 'No leave requests from employees.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  {isNepali ? 'फिल्टर हटाउनुहोस्' : 'Clear filters'}
                </button>
              )}
              {!hasActiveFilters && !isStaff && (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
                </button>
              )}
            </div>
          ) : (
            displayLeaves.map((leave) => {
              const typeConfig   = getLeaveTypeConfig(leave.type);
              const TypeIcon     = typeConfig.icon;
              const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING;
              const StatusIcon   = statusConfig.icon;
              const dates        = formatDateDisplay(leave);

              return (
                <div key={leave.id} className={`bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all overflow-hidden border-l-4 ${typeConfig.accent}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-50 mt-0.5">
                          <TypeIcon className={`w-4 h-4 ${typeConfig.iconColor}`} />
                        </div>
                        <div>
                          {activeTab === 'all' && leave.user && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-slate-900">
                                {leave.user.firstName} {leave.user.lastName}
                              </span>
                              <span className="text-[10px] text-slate-400">{leave.user.employeeId}</span>
                            </div>
                          )}
                          <h3 className="text-sm font-medium text-slate-900 mb-1.5">
                            {isNepali ? typeConfig.label : typeConfig.labelEn}
                          </h3>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{dates.primary}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium">
                                {isNepali
                                  ? `${toNepaliDigits(leave.durationDays)} दिन`
                                  : `${leave.durationDays} day${leave.durationDays > 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{dates.secondary}</p>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 px-2.5 py-1.5 rounded-md">{leave.reason}</p>
                          {leave.approver && (
                            <>
                              <p className="text-[10px] text-slate-400 mt-2">
                                {leave.status === 'APPROVED'
                                  ? isNepali ? 'स्वीकृत गर्ने:' : 'Approved by'
                                  : isNepali ? 'अस्वीकृत गर्ने:' : 'Rejected by'}{' '}
                                {leave.approver.firstName} {leave.approver.lastName}
                                {leave.approvedAt && <> • {formatADDate(leave.approvedAt)}</>}
                              </p>
                              {leave.status === 'REJECTED' && leave.rejectionMessage && (
                                <p className="text-[10px] text-rose-600 mt-1 bg-rose-50 px-2.5 py-1.5 rounded-md">
                                  {isNepali ? 'कारण: ' : 'Reason: '}
                                  {leave.rejectionMessage}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${statusConfig.bg} border`}>
                          <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                          <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                            {isNepali ? statusConfig.labelNp : statusConfig.label}
                          </span>
                        </div>
                        {activeTab === 'my' && leave.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title={isNepali ? 'रद्द गर्नुहोस्' : 'Cancel request'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeTab === 'all' && leave.status === 'PENDING' && isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              {isNepali ? 'स्वीकृत' : 'Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectingLeaveId(leave.id); setRejectMessage(''); }}
                              className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-medium hover:bg-rose-100 transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              {isNepali ? 'अस्वीकृत' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PoweredBy — only for employees */}
      {!isStaff && <PoweredBy />}

      {/* Rejection Modal */}
      {rejectingLeaveId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {isNepali ? 'बिदा अस्वीकार गर्नुहोस्' : 'Reject Leave'}
            </h3>
            <textarea
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder={isNepali ? 'कारण (वैकल्पिक)...' : 'Reason for rejection (optional)...'}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none placeholder:text-slate-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectingLeaveId(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  handleStatusUpdate(rejectingLeaveId, 'REJECTED', rejectMessage || undefined);
                  setRejectingLeaveId(null);
                }}
                className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
              >
                {isNepali ? 'अस्वीकार गर्नुहोस्' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Leave Modal — employees only */}
      {showModal && !isStaff && (
        <div className="fixed inset-0 bg-black/20 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-slate-200 mb-10">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  <CalendarDays className="w-4 h-4 text-slate-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isNepali ? 'बिदा माग्नुहोस्' : 'Request leave'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  {isNepali ? 'बिदाको प्रकार' : 'Leave type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEAVE_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-l-4 border border-slate-200 transition-all text-left
                          ${type.accent}
                          ${isSelected ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white hover:bg-slate-50'}`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? type.iconColor : 'text-slate-400'}`} />
                        <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                          {isNepali ? type.label : type.labelEn}
                        </span>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-900 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {isNepaliCalendar ? (
                  <>
                    <BSDatePicker
                      label={isNepali ? 'सुरु मिति' : 'Start date'}
                      value={formData.startDate}
                      onChange={(v) => setFormData({ ...formData, startDate: v })}
                      placeholder={isNepali ? 'सुरु मिति' : 'Start date'}
                    />
                    <BSDatePicker
                      label={isNepali ? 'अन्तिम मिति' : 'End date'}
                      value={formData.endDate}
                      onChange={(v) => setFormData({ ...formData, endDate: v })}
                      min={formData.startDate}
                      placeholder={isNepali ? 'अन्तिम मिति' : 'End date'}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {isNepali ? 'सुरु मिति' : 'Start date'}
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {isNepali ? 'अन्तिम मिति' : 'End date'}
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        min={formData.startDate}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </>
                )}
              </div>

              {getDurationDays() > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-700 font-medium">
                    {isNepali ? `अवधि: ${toNepaliDigits(getDurationDays())} दिन` : `Duration: ${getDurationDays()} day(s)`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNepali ? 'कारण' : 'Reason'}
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder={isNepali ? 'बिदाको कारण...' : 'Brief reason for leave...'}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? isNepali ? 'पेश गर्दै...' : 'Submitting...'
                    : isNepali ? 'पेश गर्नुहोस्' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isAdmin) return <AdminLayout>{pageContent}</AdminLayout>;
  if (isAccountant) return <AccountantLayout>{pageContent}</AccountantLayout>;
  return pageContent;
}