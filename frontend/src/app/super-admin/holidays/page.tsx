'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
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
} from 'lucide-react'

interface MasterHoliday {
  id: string
  name: string
  nameNepali: string
  bsYear: number
  bsMonth: number
  bsDay: number
  adDate: string
  type: 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY'
  isRecurring: boolean
  isActive: boolean
}

interface ImportStat {
  bsYear: number
  organizationsImported: number
  totalActiveOrganizations: number
}

const MONTH_NAMES_NP = [
  '',
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत्र',
]
const MONTH_NAMES_EN = [
  '',
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
]

const StatCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof LucideIcon
  label: string
  value: string | number
  sublabel?: string
  color: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
    <div className="mb-4 flex items-start justify-between">
      <div
        className={`rounded-xl bg-gradient-to-br p-3 ${color} shadow-lg shadow-${color.split(' ')[1]}/20`}
      >
        <Icon className="h-5 w-5 text-white" iconNode={[]} />
      </div>
      {sublabel && (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-400">
          {sublabel}
        </span>
      )}
    </div>
    <p className="mb-1 text-sm font-medium text-slate-600">{label}</p>
    <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
  </div>
)

const HolidayCard = ({
  holiday,
  onToggleStatus,
  onDelete,
}: {
  holiday: MasterHoliday
  onToggleStatus: () => void
  onDelete: () => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 border-white bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
                <span className="text-2xl font-bold text-slate-800">{holiday.bsDay}</span>
                <span className="-mt-1 text-[10px] font-medium text-slate-500">
                  {MONTH_NAMES_EN[holiday.bsMonth].slice(0, 3)}
                </span>
              </div>
              {holiday.isRecurring && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500">
                  <RefreshCw className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{holiday.name}</h4>
                  <p className="mt-0.5 text-sm text-slate-500">{holiday.nameNepali}</p>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-slate-100"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    holiday.type === 'PUBLIC_HOLIDAY'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {holiday.type === 'PUBLIC_HOLIDAY' ? (
                    <>
                      <Sun className="h-3 w-3" />
                      Public
                    </>
                  ) : (
                    <>
                      <Star className="h-3 w-3" />
                      Restricted
                    </>
                  )}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    holiday.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {holiday.isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {holiday.adDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                holiday.isActive
                  ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {holiday.isActive ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              {holiday.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 transition-all hover:border-rose-300 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SuperAdminHolidaysPage() {
  const { user, isLoading, logout, isSuperAdmin } = useAuth()
  const router = useRouter()

  const [holidays, setHolidays] = useState<MasterHoliday[]>([])
  const [importStats, setImportStats] = useState<ImportStat[]>([])
  const [selectedYear, setSelectedYear] = useState(2082)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY'>(
    'ALL',
  )
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const [createForm, setCreateForm] = useState({
    name: '',
    nameNepali: '',
    bsYear: 2082,
    bsMonth: 1,
    bsDay: 1,
    type: 'PUBLIC_HOLIDAY' as 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY',
    isRecurring: true,
  })

  useEffect(() => {
    if (!isLoading && (!user || !isSuperAdmin)) {
      router.push('/login')
    }
  }, [user, isLoading, isSuperAdmin, router])

  const loadHolidays = useCallback(async () => {
    const res = await api.get(`/api/v1/master-holidays?bsYear=${selectedYear}`)
    if (res.data) {
      const d = res.data as { holidays: MasterHoliday[]; importStats: ImportStat[] }
      setHolidays(d.holidays || [])
      setImportStats(d.importStats || [])
      setLastRefreshed(new Date())
    }
  }, [selectedYear])

  useEffect(() => {
    if (user && isSuperAdmin) {
      loadHolidays()
    }
  }, [user, isSuperAdmin, selectedYear, loadHolidays])

  const handleSyncYear = async (year: number) => {
    setLoading(true)
    setError('')
    const res = await api.post('/api/v1/master-holidays/sync', { bsYear: year })
    if (res.error) {
      setError(res.error.message)
    } else {
      const d = res.data as { synced: number; skipped: number; source?: string }
      const sourceLabel = d.source === 'api' ? '🌐 Calendarific API' : '💾 Built-in Data'
      setSuccess(
        `Synced ${d.synced} holidays, skipped ${d.skipped} existing (Source: ${sourceLabel})`,
      )
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  const handleCreateHoliday = async () => {
    if (!createForm.name) {
      setError('Holiday name is required')
      return
    }
    setLoading(true)
    setError('')
    const res = await api.post('/api/v1/master-holidays', createForm)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess('Master holiday created successfully')
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        nameNepali: '',
        bsYear: selectedYear,
        bsMonth: 1,
        bsDay: 1,
        type: 'PUBLIC_HOLIDAY',
        isRecurring: true,
      })
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  const toggleHolidayStatus = async (id: string, currentStatus: boolean) => {
    const res = await api.put(`/api/v1/master-holidays/${id}`, { isActive: !currentStatus })
    if (res.error) {
      setError(res.error.message)
    } else {
      setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, isActive: !currentStatus } : h)))
      setSuccess('Holiday status updated')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const deleteHoliday = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete "${name}"? This will NOT delete it from organizations that already imported it.`,
      )
    )
      return
    const res = await api.delete(`/api/v1/master-holidays/${id}`)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess('Master holiday deleted')
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // Filter and Search Logic
  const filteredHolidays = holidays.filter((holiday) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      holiday.name.toLowerCase().includes(searchLower) ||
      holiday.nameNepali.toLowerCase().includes(searchLower)

    const matchesType = filterType === 'ALL' || holiday.type === filterType
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && holiday.isActive) ||
      (filterStatus === 'INACTIVE' && !holiday.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  const currentYearStats = importStats.find((s) => s.bsYear === selectedYear)
  const yearOptions = [2081, 2082, 2083, 2084, 2085]

  // Group by month
  const groupedByMonth = filteredHolidays.reduce(
    (acc, h) => {
      if (!acc[h.bsMonth]) acc[h.bsMonth] = []
      acc[h.bsMonth].push(h)
      return acc
    },
    {} as Record<number, MasterHoliday[]>,
  )

  // Calculate stats
  const totalPublic = filteredHolidays.filter((h) => h.type === 'PUBLIC_HOLIDAY').length
  const totalRestricted = filteredHolidays.filter((h) => h.type === 'RESTRICTED_HOLIDAY').length
  const totalActive = filteredHolidays.filter((h) => h.isActive).length

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="h-6 w-6 animate-pulse text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  if (!user || !isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/super-admin')}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20 blur" />
                  <div className="relative rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 p-2.5 shadow-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-base font-semibold text-transparent">
                    Master Holidays
                  </h1>
                  <p className="text-xs text-slate-500">
                    Manage national holidays for all organizations
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastRefreshed && (
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last sync {lastRefreshed.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-900">{user.email}</p>
                  <p className="text-[10px] text-slate-400">Super Admin</p>
                </div>
                <button
                  onClick={logout}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-1.5">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="rounded-lg p-1.5 transition-colors hover:bg-rose-100"
            >
              <X className="h-4 w-4 text-rose-500" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="rounded-lg bg-emerald-100 p-1.5">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
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
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-xl">
          <div className="bg-grid-white/[0.02] absolute inset-0 bg-[size:50px_50px]" />
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/10 p-1.5 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Holiday Management
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Sync with Calendarific API</h3>
              <p className="max-w-md text-sm text-white/70">
                Automatically fetch Nepal government holidays from Calendarific API or use built-in
                data source.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSyncYear(selectedYear)}
                disabled={loading}
                className="group flex items-center gap-3 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-lg transition-all hover:bg-white/90 hover:shadow-xl disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-5 w-5 ${loading ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180'}`}
                />
                {loading ? 'Syncing...' : 'Sync Holidays'}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
                  className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-900 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      BS {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-500">
                <CalendarRange className="h-4 w-4" />
                <span>
                  {filteredHolidays.length} holidays • {totalActive} active
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-2.5 font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:from-slate-800 hover:to-slate-700"
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </button>
          </div>

          {/* Row 2: Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[300px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search holidays by name..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="min-w-[160px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-900 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">All Types</option>
                <option value="PUBLIC_HOLIDAY">Public Holidays</option>
                <option value="RESTRICTED_HOLIDAY">Restricted Holidays</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="min-w-[140px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-900 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {filterStatus === 'ACTIVE' ? (
                <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              ) : filterStatus === 'INACTIVE' ? (
                <XCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
              ) : (
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              )}
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('ALL')
                  setFilterStatus('ALL')
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Holidays by Month */}
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
              <Calendar className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                ? 'No holidays match your filters'
                : `No master holidays for BS ${selectedYear}`}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Sync from built-in data or add manually'}
            </p>
            {!(searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL') && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleSyncYear(selectedYear)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-slate-800 hover:to-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Holidays
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
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
                const isExpanded = expandedMonth === month
                const monthHolidays = groupedByMonth[month]
                const activeCount = monthHolidays.filter((h) => h.isActive).length

                return (
                  <div
                    key={month}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300"
                  >
                    {/* Month Header */}
                    <div
                      className="flex cursor-pointer items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4"
                      onClick={() => setExpandedMonth(isExpanded ? null : month)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 shadow-lg">
                          <span className="text-lg font-bold text-white">{month}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {MONTH_NAMES_EN[month]}
                            <span className="ml-2 text-sm font-normal text-slate-400">
                              {MONTH_NAMES_NP[month]}
                            </span>
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {monthHolidays.length} holidays • {activeCount} active
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {monthHolidays.length} days
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Holiday Cards */}
                    {isExpanded && (
                      <div className="space-y-3 p-5">
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
                )
              })}
          </div>
        )}
      </div>

      {/* Create Holiday Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in slide-in-from-bottom-4 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-300">
            <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 p-6">
              <div className="bg-grid-white/[0.02] absolute inset-0 bg-[size:50px_50px]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Add Master Holiday</h2>
                    <p className="text-sm text-white/70">
                      Create a new holiday for all organizations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Holiday Name (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., New Year"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Holiday Name (Nepali)
                </label>
                <input
                  type="text"
                  value={createForm.nameNepali}
                  onChange={(e) => setCreateForm({ ...createForm, nameNepali: e.target.value })}
                  placeholder="नयाँ वर्ष"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Year</label>
                  <select
                    value={createForm.bsYear}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, bsYear: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        BS {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Month</label>
                  <select
                    value={createForm.bsMonth}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, bsMonth: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {MONTH_NAMES_EN.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Day</label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={createForm.bsDay}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, bsDay: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      type: e.target.value as 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY',
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                  <option value="RESTRICTED_HOLIDAY">Restricted Holiday</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={createForm.isRecurring}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, isRecurring: e.target.checked })
                    }
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-10 rounded-full transition-colors duration-200 ${
                      createForm.isRecurring ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        createForm.isRecurring ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700">Recurring holiday</span>
                  <p className="text-xs text-slate-400">Same date every year</p>
                </div>
              </label>

              <div className="flex gap-3 border-t border-slate-200 pt-5">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHoliday}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:from-slate-800 hover:to-slate-700 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
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
  )
}
