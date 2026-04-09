'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Shield,
  Calendar,
  Plus,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Building,
  ChevronLeft,
  Search,
  Filter,
  Sparkles,
  Clock,
  Globe,
  Sun,
  Moon,
  Star,
  Award,
  TrendingUp,
  BarChart3,
  PieChart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MoreVertical,
  Edit,
  Copy,
  CalendarDays,
  CalendarRange,
  type Icon as LucideIcon,
} from 'lucide-react';

interface MasterHoliday {
  id: string;
  name: string;
  nameNepali: string;
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  adDate: string;
  type: 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY';
  isRecurring: boolean;
  isActive: boolean;
}

interface ImportStat {
  bsYear: number;
  organizationsImported: number;
  totalActiveOrganizations: number;
}

const MONTH_NAMES_NP = ['', 'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'];
const MONTH_NAMES_EN = ['', 'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

const StatCard = ({ icon: Icon, label, value, sublabel, color }: { icon: typeof LucideIcon; label: string; value: string | number; sublabel?: string; color: string }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg hover:-translate-y-0.5">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg shadow-${color.split(' ')[1]}/20`}>
        <Icon className="w-5 h-5 text-white" iconNode={[]} />
      </div>
      {sublabel && (
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {sublabel}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
  </div>
);

const HolidayCard = ({ holiday, onToggleStatus, onDelete }: { holiday: MasterHoliday; onToggleStatus: () => void; onDelete: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all shadow-sm hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center border-2 border-white shadow-sm">
                <span className="text-2xl font-bold text-slate-800">{holiday.bsDay}</span>
                <span className="text-[10px] font-medium text-slate-500 -mt-1">
                  {MONTH_NAMES_EN[holiday.bsMonth].slice(0, 3)}
                </span>
              </div>
              {holiday.isRecurring && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                  <RefreshCw className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{holiday.name}</h4>
                  <p className="text-sm text-slate-500 mt-0.5">{holiday.nameNepali}</p>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                  holiday.type === 'PUBLIC_HOLIDAY'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {holiday.type === 'PUBLIC_HOLIDAY' ? (
                    <>
                      <Sun className="w-3 h-3" />
                      Public
                    </>
                  ) : (
                    <>
                      <Star className="w-3 h-3" />
                      Restricted
                    </>
                  )}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                  holiday.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {holiday.isActive ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Inactive
                    </>
                  )}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {holiday.adDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                holiday.isActive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
              }`}
            >
              {holiday.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {holiday.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SuperAdminHolidaysPage() {
  const { user, isLoading, logout, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [holidays, setHolidays] = useState<MasterHoliday[]>([]);
  const [importStats, setImportStats] = useState<ImportStat[]>([]);
  const [selectedYear, setSelectedYear] = useState(2082);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    nameNepali: '',
    bsYear: 2082,
    bsMonth: 1,
    bsDay: 1,
    type: 'PUBLIC_HOLIDAY' as 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY',
    isRecurring: true,
  });

  useEffect(() => {
    if (!isLoading && (!user || !isSuperAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isSuperAdmin, router]);

  const loadHolidays = useCallback(async () => {
    const res = await api.get(`/api/v1/master-holidays?bsYear=${selectedYear}`);
    if (res.data) {
      const d = res.data as { holidays: MasterHoliday[]; importStats: ImportStat[] };
      setHolidays(d.holidays || []);
      setImportStats(d.importStats || []);
      setLastRefreshed(new Date());
    }
  }, [selectedYear]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      loadHolidays();
    }
  }, [user, isSuperAdmin, selectedYear, loadHolidays]);

  const handleSyncYear = async (year: number) => {
    setLoading(true);
    setError('');
    const res = await api.post('/api/v1/master-holidays/sync', { bsYear: year });
    if (res.error) {
      setError(res.error.message);
    } else {
      const d = res.data as { synced: number; skipped: number; source?: string };
      const sourceLabel = d.source === 'api' ? '🌐 Calendarific API' : '💾 Built-in Data';
      setSuccess(`Synced ${d.synced} holidays, skipped ${d.skipped} existing (Source: ${sourceLabel})`);
      loadHolidays();
      setTimeout(() => setSuccess(''), 3000);
    }
    setLoading(false);
  };

  const handleCreateHoliday = async () => {
    if (!createForm.name) {
      setError('Holiday name is required');
      return;
    }
    setLoading(true);
    setError('');
    const res = await api.post('/api/v1/master-holidays', createForm);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess('Master holiday created successfully');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        nameNepali: '',
        bsYear: selectedYear,
        bsMonth: 1,
        bsDay: 1,
        type: 'PUBLIC_HOLIDAY',
        isRecurring: true,
      });
      loadHolidays();
      setTimeout(() => setSuccess(''), 3000);
    }
    setLoading(false);
  };

  const toggleHolidayStatus = async (id: string, currentStatus: boolean) => {
    const res = await api.put(`/api/v1/master-holidays/${id}`, { isActive: !currentStatus });
    if (res.error) {
      setError(res.error.message);
    } else {
      setHolidays((prev) =>
        prev.map((h) => (h.id === id ? { ...h, isActive: !currentStatus } : h))
      );
      setSuccess('Holiday status updated');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const deleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will NOT delete it from organizations that already imported it.`)) return;
    const res = await api.delete(`/api/v1/master-holidays/${id}`);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess('Master holiday deleted');
      loadHolidays();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Filter and Search Logic
  const filteredHolidays = holidays.filter((holiday) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      holiday.name.toLowerCase().includes(searchLower) ||
      holiday.nameNepali.toLowerCase().includes(searchLower);

    const matchesType = filterType === 'ALL' || holiday.type === filterType;
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && holiday.isActive) ||
      (filterStatus === 'INACTIVE' && !holiday.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  const currentYearStats = importStats.find((s) => s.bsYear === selectedYear);
  const yearOptions = [2081, 2082, 2083, 2084, 2085];

  // Group by month
  const groupedByMonth = filteredHolidays.reduce((acc, h) => {
    if (!acc[h.bsMonth]) acc[h.bsMonth] = [];
    acc[h.bsMonth].push(h);
    return acc;
  }, {} as Record<number, MasterHoliday[]>);

  // Calculate stats
  const totalPublic = filteredHolidays.filter(h => h.type === 'PUBLIC_HOLIDAY').length;
  const totalRestricted = filteredHolidays.filter(h => h.type === 'RESTRICTED_HOLIDAY').length;
  const totalActive = filteredHolidays.filter(h => h.isActive).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-slate-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/super-admin')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-20" />
                  <div className="relative p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-base font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Master Holidays
                  </h1>
                  <p className="text-xs text-slate-500">Manage national holidays for all organizations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastRefreshed && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last sync {lastRefreshed.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-900">{user.email}</p>
                  <p className="text-[10px] text-slate-400">Super Admin</p>
                </div>
                <button onClick={logout} className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-slate-400 hover:text-rose-600">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-rose-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <StatCard
            icon={Building}
            label="Organizations Imported"
            value={`${currentYearStats?.organizationsImported || 0} / ${currentYearStats?.totalActiveOrganizations || 0}`}
            sublabel={`BS ${selectedYear}`}
            color="from-slate-900 to-slate-700"
          />
          <StatCard
            icon={Calendar}
            label="Total Holidays"
            value={holidays.length}
            sublabel="Master List"
            color="from-cyan-500 to-blue-500"
          />
          <StatCard
            icon={Sun}
            label="Public Holidays"
            value={totalPublic}
            sublabel={`${((totalPublic / holidays.length) * 100 || 0).toFixed(0)}% of total`}
            color="from-emerald-500 to-teal-500"
          />
          <StatCard
            icon={Star}
            label="Restricted Holidays"
            value={totalRestricted}
            sublabel={`${((totalRestricted / holidays.length) * 100 || 0).toFixed(0)}% of total`}
            color="from-amber-500 to-orange-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl" />
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Holiday Management</span>
              </div>
              <h3 className="text-xl font-bold text-white">Sync with Calendarific API</h3>
              <p className="text-white/70 text-sm max-w-md">
                Automatically fetch Nepal government holidays from Calendarific API or use built-in data source.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSyncYear(selectedYear)}
                disabled={loading}
                className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {loading ? 'Syncing...' : 'Sync Holidays'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 space-y-4">
          {/* Row 1: Year Selection + Add Button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>BS {y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                <CalendarRange className="w-4 h-4" />
                <span>{filteredHolidays.length} holidays • {totalActive} active</span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg shadow-slate-900/20"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          </div>

          {/* Row 2: Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search holidays by name..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all cursor-pointer min-w-[160px]"
              >
                <option value="ALL">All Types</option>
                <option value="PUBLIC_HOLIDAY">Public Holidays</option>
                <option value="RESTRICTED_HOLIDAY">Restricted Holidays</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all cursor-pointer min-w-[140px]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {filterStatus === 'ACTIVE' ? (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
              ) : filterStatus === 'INACTIVE' ? (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 pointer-events-none" />
              ) : (
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              )}
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('ALL');
                  setFilterStatus('ALL');
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Holidays by Month */}
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                ? 'No holidays match your filters'
                : `No master holidays for BS ${selectedYear}`}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Sync from built-in data or add manually'}
            </p>
            {!(searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL') && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleSyncYear(selectedYear)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync Holidays
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedByMonth)
              .map(Number)
              .sort((a, b) => a - b)
              .map((month) => {
                const isExpanded = expandedMonth === month;
                const monthHolidays = groupedByMonth[month];
                const activeCount = monthHolidays.filter(h => h.isActive).length;

                return (
                  <div key={month} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-all shadow-sm">
                    {/* Month Header */}
                    <div
                      className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedMonth(isExpanded ? null : month)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-lg font-bold text-white">{month}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {MONTH_NAMES_EN[month]}
                            <span className="text-sm font-normal text-slate-400 ml-2">{MONTH_NAMES_NP[month]}</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {monthHolidays.length} holidays • {activeCount} active
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                            {monthHolidays.length} days
                          </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Holiday Cards */}
                    {isExpanded && (
                      <div className="p-5 space-y-3">
                        {monthHolidays.map((holiday) => (
                          <HolidayCard
                            key={holiday.id}
                            holiday={holiday}
                            onToggleStatus={() => toggleHolidayStatus(holiday.id, holiday.isActive)}
                            onDelete={() => deleteHoliday(holiday.id, holiday.name)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Create Holiday Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 p-6">
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Add Master Holiday</h2>
                    <p className="text-sm text-white/70">Create a new holiday for all organizations</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Holiday Name (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., New Year"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Holiday Name (Nepali)
                </label>
                <input
                  type="text"
                  value={createForm.nameNepali}
                  onChange={(e) => setCreateForm({ ...createForm, nameNepali: e.target.value })}
                  placeholder="नयाँ वर्ष"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Year</label>
                  <select
                    value={createForm.bsYear}
                    onChange={(e) => setCreateForm({ ...createForm, bsYear: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>BS {y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Month</label>
                  <select
                    value={createForm.bsMonth}
                    onChange={(e) => setCreateForm({ ...createForm, bsMonth: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {MONTH_NAMES_EN.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Day</label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={createForm.bsDay}
                    onChange={(e) => setCreateForm({ ...createForm, bsDay: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY' })}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                  <option value="RESTRICTED_HOLIDAY">Restricted Holiday</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={createForm.isRecurring}
                    onChange={(e) => setCreateForm({ ...createForm, isRecurring: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                    createForm.isRecurring ? 'bg-slate-900' : 'bg-slate-200'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 absolute top-1 ${
                      createForm.isRecurring ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700">Recurring holiday</span>
                  <p className="text-xs text-slate-400">Same date every year</p>
                </div>
              </label>

              <div className="flex gap-3 pt-5 border-t border-slate-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHoliday}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl text-sm font-medium hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Holiday'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}