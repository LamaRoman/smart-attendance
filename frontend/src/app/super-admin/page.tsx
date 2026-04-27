'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import {
  Shield,
  Building,
  Users,
  Plus,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Globe,
  Calendar,
  CreditCard,
  CalendarDays,
  FileText,
  QrCode,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Search,
  CalendarCheck,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  UsersRound,
  Clock,
  BarChart3,
  Calculator,
  ChevronRight,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  staticQREnabled: boolean
  rotatingQREnabled: boolean
  calendarMode: 'NEPALI' | 'ENGLISH'
  language: 'NEPALI' | 'ENGLISH'
  createdAt: string
  stats: {
    totalUsers: number
    totalEmployees: number
    totalAdmins: number
    totalAttendanceRecords: number
    employeesWithPayroll: number
  }
}

interface PlatformStats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  totalAttendanceRecords: number
  totalMasterHolidays?: number
  totalEmployees?: number
  totalAdmins?: number
}

interface CreateOrgForm {
  name: string
  email: string
  phone: string
  address: string
  adminEmail: string
  adminPassword: string
  adminFirstName: string
  adminLastName: string
}

const FEATURE_CONFIG = [
  { key: 'staticQREnabled', label: 'Static QR', icon: QrCode },
  { key: 'rotatingQREnabled', label: 'Rotating QR', icon: RefreshCw },
]

export default function SuperAdminPage() {
  const { user, isLoading, logout, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [createForm, setCreateForm] = useState<CreateOrgForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [orgsRes, statsRes, holidaysRes] = await Promise.all([
      api.get('/api/v1/super-admin/organizations'),
      api.get('/api/v1/super-admin/stats'),
      api.get('/api/v1/master-holidays?bsYear=2082'),
    ])
    if (orgsRes.data) {
      const d = orgsRes.data as Record<string, unknown>
      setOrganizations((d.organizations || []) as Organization[])
    }
    if (statsRes.data) {
      const d = statsRes.data as Record<string, unknown>
      const s = d.stats as Record<string, Record<string, number>>
      if (s) {
        const baseStats = {
          totalOrganizations: s.organizations?.total || 0,
          activeOrganizations: s.organizations?.active || 0,
          totalUsers: s.users?.total || 0,
          totalEmployees: s.users?.employees || 0,
          totalAdmins: s.users?.orgAdmins || 0,
          totalAttendanceRecords: s.attendance?.totalRecords || 0,
        }
        if (holidaysRes.data) {
          const hd = holidaysRes.data as Record<string, unknown>
          const holidays = (hd.holidays || []) as Array<unknown>
          setStats({ ...baseStats, totalMasterHolidays: holidays.length })
        } else {
          setStats(baseStats)
        }
      }
    }
    setLastRefreshed(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])
  const handleCreateOrg = async () => {
    if (
      !createForm.name ||
      !createForm.adminEmail ||
      !createForm.adminPassword ||
      !createForm.adminFirstName ||
      !createForm.adminLastName
    ) {
      setError('Please fill in all required fields')
      return
    }
    const pw = createForm.adminPassword
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) {
      setError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number')
      return
    }
    setLoading(true)
    setError('')
    const res = await api.post('/api/v1/super-admin/organizations', createForm)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess('Organization created successfully')
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        adminEmail: '',
        adminPassword: '',
        adminFirstName: '',
        adminLastName: '',
      })
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  const toggleOrgStatus = async (orgId: string) => {
    const res = await api.patch('/api/v1/super-admin/organizations/' + orgId + '/toggle-status')
    if (res.error) {
      setError(res.error.message)
    } else {
      loadData()
      setSuccess('Organization status updated')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const toggleOrgFeature = async (orgId: string, field: string, current: boolean) => {
    const res = await api.patch(`/api/v1/super-admin/organizations/${orgId}`, { [field]: !current })
    if (res.error) {
      setError(res.error.message)
    } else {
      loadData()
      setSuccess('Feature updated')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm('Delete "' + orgName + '"? This cannot be undone.')) return
    const res = await api.delete('/api/v1/super-admin/organizations/' + orgId)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess('Organization deleted')
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.email || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Header — Stripe-style: white, thin border, compact */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-slate-900" />
              <span className="text-sm font-semibold text-slate-900">Super Admin</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">Platform Management</span>
            </div>
            <div className="flex items-center gap-1">
              {lastRefreshed && (
                <span className="mr-2 text-xs text-slate-400">
                  Synced{' '}
                  {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => router.push('/super-admin/holidays')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Holidays
              </button>
              <button
                onClick={() => router.push('/super-admin/tds-slabs')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Calculator className="h-3.5 w-3.5" />
                TDS Slabs
              </button>
              <button
                onClick={() => router.push('/super-admin/subscriptions')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Subscriptions
              </button>
              <button
                onClick={() => router.push('/super-admin/plans')}
                className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
              >
                <ToggleRight className="h-3.5 w-3.5" />
                Feature Flags
              </button>
              <div className="mx-1 h-4 w-px bg-slate-200" />
              <button
                onClick={logout}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')}>
              <X className="h-3.5 w-3.5 text-rose-400" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats — Stripe-style horizontal metric strip */}
        {stats && (
          <div className="mb-8 grid grid-cols-7 gap-0 overflow-hidden rounded-xl border border-slate-200">
            {[
              { label: 'Organizations', value: stats.totalOrganizations, icon: Building },
              { label: 'Active', value: stats.activeOrganizations, icon: Activity },
              { label: 'Total Users', value: stats.totalUsers, icon: Users },
              { label: 'Employees', value: stats.totalEmployees ?? 0, icon: UsersRound },
              { label: 'Org Admins', value: stats.totalAdmins ?? 0, icon: Shield },
              { label: 'Attendance', value: stats.totalAttendanceRecords, icon: Zap },
              { label: 'Holidays', value: stats.totalMasterHolidays || 0, icon: CalendarCheck },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`bg-white px-5 py-4 ${i < 6 ? 'border-r border-slate-200' : ''}`}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <s.icon className="h-3 w-3 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
                </div>
                <p className="text-xl font-semibold tracking-tight text-slate-900">
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Organizations</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredOrgs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations..."
                className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              New Organization
            </button>
          </div>
        </div>

        {/* Organization Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
            <div className="col-span-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Organization
            </div>
            <div className="col-span-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Users
            </div>
            <div className="col-span-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Features
            </div>
            <div className="col-span-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Created
            </div>
            <div className="col-span-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Status
            </div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filteredOrgs.map((org) => {
              const isExpanded = expandedOrg === org.id
              return (
                <div key={org.id}>
                  {/* Main row */}
                  <div
                    className="grid cursor-pointer grid-cols-12 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/50"
                    onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                  >
                    {/* Name + email */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${org.isActive ? 'bg-slate-900' : 'bg-slate-300'}`}
                        >
                          <Building className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{org.name}</p>
                          <p className="truncate text-xs text-slate-400">{org.email || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Users breakdown */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-slate-900">{org.stats.totalUsers}</p>
                      <p className="text-xs text-slate-400">
                        {org.stats.totalAdmins} admin · {org.stats.totalEmployees} emp
                      </p>
                    </div>

                    {/* Feature pills */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      {FEATURE_CONFIG.map((f) => {
                        const enabled = (org as unknown as Record<string, unknown>)[
                          f.key
                        ] as boolean
                        return (
                          <span
                            key={f.key}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            <f.icon className="h-2.5 w-2.5" />
                            {f.label}
                          </span>
                        )
                      })}
                    </div>

                    {/* Created */}
                    <div className="col-span-2">
                      <p className="text-xs text-slate-600">
                        {new Date(org.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${org.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${org.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        />
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Expand */}
                    <div className="col-span-1 flex justify-end">
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5">
                      <div className="grid grid-cols-3 gap-6">
                        {/* Statistics */}
                        <div>
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Statistics
                          </p>
                          <div className="space-y-2">
                            {[
                              { label: 'Total Users', value: org.stats.totalUsers },
                              { label: 'Org Admins', value: org.stats.totalAdmins },
                              { label: 'Employees', value: org.stats.totalEmployees },
                              {
                                label: 'Attendance Records',
                                value: org.stats.totalAttendanceRecords,
                              },
                            ].map((row) => (
                              <div
                                key={row.label}
                                className="flex items-center justify-between border-b border-slate-200 py-1.5 last:border-0"
                              >
                                <span className="text-xs text-slate-500">{row.label}</span>
                                <span className="text-xs font-semibold text-slate-900">
                                  {row.value.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Details */}
                        <div>
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Details
                          </p>
                          <div className="space-y-2">
                            {[
                              {
                                label: 'Language',
                                value: org.language === 'NEPALI' ? 'Nepali' : 'English',
                              },
                              {
                                label: 'Calendar',
                                value:
                                  org.calendarMode === 'NEPALI' ? 'Bikram Sambat' : 'Gregorian',
                              },
                              { label: 'Phone', value: org.phone || '—' },
                              { label: 'Address', value: org.address || '—' },
                            ].map((row) => (
                              <div
                                key={row.label}
                                className="flex items-center justify-between border-b border-slate-200 py-1.5 last:border-0"
                              >
                                <span className="text-xs text-slate-500">{row.label}</span>
                                <span className="max-w-36 truncate text-right text-xs font-medium text-slate-900">
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Features + Actions */}
                        <div>
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Features
                          </p>
                          <div className="mb-4 space-y-2">
                            {FEATURE_CONFIG.map((f) => {
                              const enabled = (org as unknown as Record<string, unknown>)[
                                f.key
                              ] as boolean
                              return (
                                <button
                                  key={f.key}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleOrgFeature(org.id, f.key, enabled)
                                  }}
                                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${enabled ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <f.icon
                                      className={`h-3.5 w-3.5 ${enabled ? 'text-slate-700' : 'text-slate-300'}`}
                                    />
                                    {f.label}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}
                                  >
                                    {enabled ? 'ON' : 'OFF'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          <div className="flex gap-2 border-t border-slate-200 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleOrgStatus(org.id)
                              }}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${org.isActive ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                            >
                              {org.isActive ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              {org.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteOrg(org.id, org.name)
                              }}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredOrgs.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Building className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="mb-1 text-sm font-medium text-slate-900">No organizations found</p>
                <p className="mb-4 text-xs text-slate-500">
                  Try adjusting your search or create a new organization
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Organization
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Create Organization</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Add a new organization to the platform
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Organization Details
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Acme Corporation"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="info@company.com"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                      <input
                        type="text"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        placeholder="+977 1 2345678"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                    <input
                      type="text"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      placeholder="Kathmandu, Nepal"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Admin Account
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.adminFirstName}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, adminFirstName: e.target.value })
                        }
                        placeholder="John"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.adminLastName}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, adminLastName: e.target.value })
                        }
                        placeholder="Doe"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Admin Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      placeholder="admin@company.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={createForm.adminPassword}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, adminPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    {createForm.adminPassword && (
                      <div className="mt-2 space-y-1">
                        {[
                          {
                            test: createForm.adminPassword.length >= 8,
                            label: 'At least 8 characters',
                          },
                          {
                            test: /[A-Z]/.test(createForm.adminPassword),
                            label: 'One uppercase letter',
                          },
                          {
                            test: /[a-z]/.test(createForm.adminPassword),
                            label: 'One lowercase letter',
                          },
                          { test: /[0-9]/.test(createForm.adminPassword), label: 'One number' },
                          {
                            test: /[^A-Za-z0-9]/.test(createForm.adminPassword),
                            label: 'One special character',
                          },
                        ].map((rule) => (
                          <div key={rule.label} className="flex items-center gap-1.5">
                            {rule.test ? (
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-slate-300" />
                            )}
                            <span
                              className={`text-[11px] ${rule.test ? 'text-emerald-600' : 'text-slate-400'}`}
                            >
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!createForm.adminPassword && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Min 8 characters, 1 uppercase, 1 lowercase, 1 number
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
