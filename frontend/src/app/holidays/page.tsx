'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import {
  Calendar,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Sun,
  Star,
  Building,
  Download,
  Check,
  Briefcase,
  RotateCcw,
} from 'lucide-react'

interface Holiday {
  id: string
  name: string
  nameNepali: string | null
  date: string
  bsYear: number
  bsMonth: number
  bsDay: number
  type: 'PUBLIC_HOLIDAY' | 'RESTRICTED_HOLIDAY' | 'ORGANIZATION_HOLIDAY' | 'WORKING_DAY_OVERRIDE'
  isActive: boolean
  isRecurring: boolean
  description: string | null
  alreadyImported?: boolean
  // Added by listHolidays — indicates this holiday has been overridden for this org
  isOverridden?: boolean
  overrideId?: string | null
}

const TYPE_CONFIG = {
  PUBLIC_HOLIDAY: {
    labelNp: 'सार्वजनिक बिदा',
    labelEn: 'Public holiday',
    icon: Sun,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  RESTRICTED_HOLIDAY: {
    labelNp: 'प्रतिबन्धित बिदा',
    labelEn: 'Restricted holiday',
    icon: Star,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ORGANIZATION_HOLIDAY: {
    labelNp: 'संस्थागत बिदा',
    labelEn: 'Organization holiday',
    icon: Building,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  WORKING_DAY_OVERRIDE: {
    labelNp: 'कार्य दिन ओभरराइड',
    labelEn: 'Working day override',
    icon: Briefcase,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

const BS_MONTHS = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
]
const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashar',
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

export default function HolidaysPage() {
  const { user, isLoading, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [filterYear, setFilterYear] = useState(2082)
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [masterHolidays, setMasterHolidays] = useState<Holiday[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const [form, setForm] = useState({
    name: '',
    nameNepali: '',
    bsYear: 2082,
    bsMonth: 1,
    bsDay: 1,
    date: '',
    type: 'PUBLIC_HOLIDAY' as const,
    description: '',
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ORG_ADMIN')) router.push('/login')
  }, [user, isLoading, router])

  const loadHolidays = useCallback(async () => {
    let url = '/api/v1/holidays?bsYear=' + filterYear
    if (filterMonth) url += '&bsMonth=' + filterMonth
    const res = await api.get(url)
    if (res.data) {
      setHolidays(res.data as Holiday[])
      setLastRefreshed(new Date())
    }
  }, [filterYear, filterMonth])

  useEffect(() => {
    if (user?.role === 'ORG_ADMIN') loadHolidays()
  }, [user, filterYear, filterMonth, loadHolidays])

  const loadMasterHolidays = async () => {
    const res = await api.get('/api/v1/holidays/master?bsYear=' + filterYear)
    if (res.data) {
      setMasterHolidays(res.data as Holiday[])
    }
  }

  const syncHolidays = async () => {
    setSyncing(true)
    setError('')
    const res = await api.post('/api/v1/holidays/sync', { bsYear: filterYear })
    if (res.error) {
      setError(res.error.message)
    } else {
      const d = res.data as any
      setSuccess(d.message || (isNp ? 'बिदाहरू सिंक गरियो' : 'Holidays synced'))
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSyncing(false)
  }

  const openImportModal = async () => {
    setShowImportModal(true)
    await loadMasterHolidays()
  }

  const importMasterHolidays = async () => {
    setImporting(true)
    setError('')
    const res = await api.post('/api/v1/holidays/import', { bsYear: filterYear })
    if (res.error) {
      setError(res.error.message)
    } else {
      const d = res.data as { imported: number; skipped: number }
      setSuccess(
        isNp
          ? `${d.imported} बिदा आयात गरियो, ${d.skipped} पहिले नै छ`
          : `Imported ${d.imported} holidays, ${d.skipped} already exist`,
      )
      setShowImportModal(false)
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
    setImporting(false)
  }

  const addHoliday = async () => {
    if (!form.name || !form.date) {
      setError(isNp ? 'नाम र मिति आवश्यक छ' : 'Name and date are required')
      return
    }
    const res = await api.post('/api/v1/holidays', form)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'बिदा थपियो' : 'Holiday added')
      setShowAddModal(false)
      setForm({
        name: '',
        nameNepali: '',
        bsYear: 2082,
        bsMonth: 1,
        bsDay: 1,
        date: '',
        type: 'PUBLIC_HOLIDAY',
        description: '',
      })
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const deleteHoliday = async (id: string, name: string) => {
    if (!confirm((isNp ? 'मेटाउने: ' : 'Delete: ') + name + '?')) return
    const res = await api.delete('/api/v1/holidays/' + id)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'बिदा मेटाइयो' : 'Holiday deleted')
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // Mark a public/org holiday as a working day for this org
  const createOverride = async (holiday: Holiday) => {
    if (
      !confirm(
        isNp
          ? `के ${holiday.nameNepali || holiday.name} मा काम गर्ने? यो तपाईंको संस्थाको लागि मात्र लागू हुन्छ।`
          : `Mark "${holiday.name}" as a working day for your org? This only affects your organization.`,
      )
    )
      return

    const res = await api.post('/api/v1/holidays', {
      name: `${holiday.name} (Working day)`,
      nameNepali: holiday.nameNepali ? `${holiday.nameNepali} (कार्य दिन)` : undefined,
      bsYear: holiday.bsYear,
      bsMonth: holiday.bsMonth,
      bsDay: holiday.bsDay,
      date: holiday.date,
      type: 'WORKING_DAY_OVERRIDE',
      isRecurring: false,
    })

    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(
        isNp
          ? 'कार्य दिन सेट गरियो — तलब गणनामा सामेल हुन्छ'
          : 'Marked as working day — will be included in payroll',
      )
      loadHolidays()
      setTimeout(() => setSuccess(''), 4000)
    }
  }

  // Remove override — holiday becomes a day off again
  const removeOverride = async (overrideId: string, holidayName: string) => {
    if (
      !confirm(
        isNp
          ? `${holidayName} फेरि बिदा बनाउने?`
          : `Restore "${holidayName}" as a holiday (remove working day override)?`,
      )
    )
      return

    const res = await api.delete('/api/v1/holidays/' + overrideId)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'बिदा पुनर्स्थापित गरियो' : 'Holiday restored')
      loadHolidays()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-100 border-t-slate-800" />
      </div>
    )
  }

  if (!user) return null

  // Group holidays by month
  const grouped: Record<number, Holiday[]> = {}
  holidays.forEach((h) => {
    if (!grouped[h.bsMonth]) grouped[h.bsMonth] = []
    grouped[h.bsMonth].push(h)
  })

  // Group master holidays by month for import modal
  const groupedMaster: Record<number, Holiday[]> = {}
  masterHolidays.forEach((h) => {
    if (!groupedMaster[h.bsMonth]) groupedMaster[h.bsMonth] = []
    groupedMaster[h.bsMonth].push(h)
  })

  const newHolidaysCount = masterHolidays.filter((h) => !h.alreadyImported).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isNp ? 'बिदा व्यवस्थापन' : 'Holiday management'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isNp
                ? 'सार्वजनिक र संस्थागत बिदाहरू व्यवस्थापन'
                : 'Manage public and organization holidays'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
            <button
              onClick={loadHolidays}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {[2080, 2081, 2082, 2083, 2084, 2085].map((y) => (
                  <option key={y} value={y}>
                    {y} BS
                  </option>
                ))}
              </select>
              <select
                value={filterMonth || ''}
                onChange={(e) =>
                  setFilterMonth(e.target.value ? Number(e.target.value) : undefined)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{isNp ? 'सबै महिना' : 'All months'}</option>
                {BS_MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {isNp ? m : BS_MONTHS_EN[i]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openImportModal}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                {isNp ? 'मास्टर आयात' : 'Import master'}
              </button>
              <button
                onClick={syncHolidays}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {isNp ? 'नेपाल बिदा सिंक' : 'Sync Nepal'}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {isNp ? 'बिदा थप्नुहोस्' : 'Add holiday'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              {holidays.length}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{isNp ? 'जम्मा बिदा' : 'Total'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-xl font-semibold tracking-tight text-rose-600">
              {holidays.filter((h) => h.type === 'PUBLIC_HOLIDAY').length}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{isNp ? 'सार्वजनिक' : 'Public'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-xl font-semibold tracking-tight text-blue-600">
              {holidays.filter((h) => h.type === 'ORGANIZATION_HOLIDAY').length}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isNp ? 'संस्थागत' : 'Organization'}
            </div>
          </div>
        </div>

        {/* Holidays List by Month */}
        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([month, items]) => (
              <div
                key={month}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {isNp ? BS_MONTHS[Number(month) - 1] : BS_MONTHS_EN[Number(month) - 1]}{' '}
                    {filterYear}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((h) => {
                    const cfg = TYPE_CONFIG[h.type]
                    const canOverride =
                      h.type === 'PUBLIC_HOLIDAY' || h.type === 'ORGANIZATION_HOLIDAY'
                    return (
                      <div
                        key={h.id}
                        className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50 ${h.isOverridden ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
                            <span className="text-[10px] font-medium text-slate-500">
                              {isNp
                                ? BS_MONTHS[h.bsMonth - 1].slice(0, 3)
                                : BS_MONTHS_EN[h.bsMonth - 1].slice(0, 3)}
                            </span>
                            <span className="text-base font-semibold text-slate-900">
                              {h.bsDay}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {isNp && h.nameNepali ? h.nameNepali : h.name}
                              </span>
                              {h.isOverridden && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                  <Briefcase className="h-3 w-3" />
                                  {isNp ? 'काम गर्ने दिन' : 'Working day'}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                              >
                                <cfg.icon className="h-3 w-3" />
                                {isNp ? cfg.labelNp : cfg.labelEn}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(h.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Override / restore buttons for public and org holidays */}
                          {canOverride && !h.isOverridden && (
                            <button
                              onClick={() => createOverride(h)}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                              title={isNp ? 'यो दिन काम गर्ने' : 'Work this day'}
                            >
                              <Briefcase className="h-4 w-4" />
                            </button>
                          )}
                          {canOverride && h.isOverridden && h.overrideId && (
                            <button
                              onClick={() => removeOverride(h.overrideId!, h.name)}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                              title={isNp ? 'बिदा पुनर्स्थापित गर्नुहोस्' : 'Restore as holiday'}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteHoliday(h.id, h.name)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {isNp ? 'कुनै बिदा छैन' : 'No holidays'}
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              {isNp
                ? 'मास्टरबाट आयात गर्नुहोस् वा नयाँ थप्नुहोस्'
                : 'Import from master or add new'}
            </p>
          </div>
        )}
      </div>

      {/* Import from Master Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isNp ? 'मास्टर बिदा आयात गर्नुहोस्' : 'Import master holidays'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isNp ? `बि.सं. ${filterYear} को लागि` : `For BS ${filterYear}`}
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {masterHolidays.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                  {isNp ? 'कुनै मास्टर बिदा उपलब्ध छैन' : 'No master holidays available'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isNp
                    ? `सुपर एडमिनले बि.सं. ${filterYear} को लागि बिदा थपेको छैन`
                    : `Super admin hasn't added holidays for BS ${filterYear}`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">{masterHolidays.length}</span>{' '}
                    {isNp ? 'बिदाहरू उपलब्ध' : 'holidays available'}
                  </div>
                  {newHolidaysCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] font-medium text-emerald-700">
                        {newHolidaysCount} {isNp ? 'नयाँ' : 'new'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {Object.entries(groupedMaster)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([month, items]) => (
                      <div
                        key={month}
                        className="overflow-hidden rounded-lg border border-slate-200"
                      >
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                          <h4 className="text-xs font-semibold text-slate-900">
                            {isNp ? BS_MONTHS[Number(month) - 1] : BS_MONTHS_EN[Number(month) - 1]}
                          </h4>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {items.map((h) => {
                            const cfg = TYPE_CONFIG[h.type]
                            return (
                              <div
                                key={h.id}
                                className={`flex items-center justify-between p-3 ${h.alreadyImported ? 'bg-slate-50' : 'bg-white'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white">
                                    <span className="text-[10px] text-slate-500">
                                      {h.bsMonth}/{h.bsDay}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-slate-900">
                                      {isNp && h.nameNepali ? h.nameNepali : h.name}
                                    </div>
                                    <span
                                      className={
                                        'mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ' +
                                        cfg.color
                                      }
                                    >
                                      <cfg.icon className="h-2.5 w-2.5" />
                                      {isNp ? cfg.labelNp : cfg.labelEn}
                                    </span>
                                  </div>
                                </div>
                                {h.alreadyImported && (
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{isNp ? 'पहिले नै छ' : 'Imported'}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-white"
                    >
                      {isNp ? 'रद्द' : 'Cancel'}
                    </button>
                    <button
                      onClick={importMasterHolidays}
                      disabled={importing || newHolidaysCount === 0}
                      className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                      {importing
                        ? isNp
                          ? 'आयात गर्दै...'
                          : 'Importing...'
                        : newHolidaysCount === 0
                          ? isNp
                            ? 'सबै आयात भयो'
                            : 'All imported'
                          : isNp
                            ? `${newHolidaysCount} आयात गर्नुहोस्`
                            : `Import ${newHolidaysCount}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-slate-100 p-1.5">
                  <Plus className="h-4 w-4 text-slate-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isNp ? 'नयाँ बिदा' : 'Add holiday'}
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {isNp ? 'नाम (English)' : 'Name (English)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {isNp ? 'नाम (नेपाली)' : 'Name (Nepali)'}
                </label>
                <input
                  type="text"
                  value={form.nameNepali}
                  onChange={(e) => setForm({ ...form, nameNepali: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {isNp ? 'वर्ष' : 'Year'}
                  </label>
                  <input
                    type="number"
                    value={form.bsYear}
                    onChange={(e) => setForm({ ...form, bsYear: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {isNp ? 'महिना' : 'Month'}
                  </label>
                  <select
                    value={form.bsMonth}
                    onChange={(e) => setForm({ ...form, bsMonth: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {BS_MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {isNp ? m : BS_MONTHS_EN[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {isNp ? 'दिन' : 'Day'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={form.bsDay}
                    onChange={(e) => setForm({ ...form, bsDay: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {isNp ? 'AD मिति' : 'AD date'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {isNp ? 'प्रकार' : 'Type'}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="PUBLIC_HOLIDAY">
                    {isNp ? 'सार्वजनिक बिदा' : 'Public holiday'}
                  </option>
                  <option value="RESTRICTED_HOLIDAY">
                    {isNp ? 'प्रतिबन्धित बिदा' : 'Restricted holiday'}
                  </option>
                  <option value="ORGANIZATION_HOLIDAY">
                    {isNp ? 'संस्थागत बिदा' : 'Organization holiday'}
                  </option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {isNp ? 'विवरण' : 'Description'}
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  onClick={addHoliday}
                  className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                >
                  {isNp ? 'बिदा थप्नुहोस्' : 'Add holiday'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
