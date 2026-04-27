'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import EmployeeDetailModal from '@/components/EmployeeDetailModal'
import BSDatePicker from '@/components/BSDatePicker'
import {
  FileText,
  Users,
  UserPlus,
  Search,
  Edit,
  UserMinus,
  Shield,
  UserCheck,
  CheckCircle,
  XCircle,
  Save,
  Key,
  Mail,
  User,
  X,
  AlertCircle,
  RefreshCw,
  Link,
  Calendar,
  Printer,
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeId: string
  role: string
  isActive: boolean
  status?: string
  createdAt: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  workingDays?: string | null
  dateOfBirth?: string | null
}

// ── PIN Reveal Modal ──────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser, isLoading, language } = useAuth()
  const router = useRouter()
  const isNp = language === 'NEPALI'

  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ORG_ADMIN' | 'EMPLOYEE'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const [showModal, setShowModal] = useState(false)
  const [docUserId, setDocUserId] = useState<string | null>(null)
  const [docUserName, setDocUserName] = useState('')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [empCap, setEmpCap] = useState<{ current: number; max: number | null } | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'existing'>('create')
  const [showRosterMenu, setShowRosterMenu] = useState(false)
  const [rosterIncludeTime, setRosterIncludeTime] = useState(false)
  const [rosterPeriod, setRosterPeriod] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    panNumber: '',
    dateOfBirth: '',
    role: 'EMPLOYEE' as 'ORG_ADMIN' | 'ORG_ACCOUNTANT' | 'EMPLOYEE',
    shiftStartTime: '',
    shiftEndTime: '',
    workingDays: '',
  })

  const [existingFormData, setExistingFormData] = useState({
    platformId: '',
    role: 'EMPLOYEE' as 'ORG_ADMIN' | 'ORG_ACCOUNTANT' | 'EMPLOYEE',
    panNumber: '',
    shiftStartTime: '',
    shiftEndTime: '',
    workingDays: '',
  })

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'ORG_ADMIN')) router.push('/login')
  }, [currentUser, isLoading, router])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/api/v1/users')
    if (res.data && Array.isArray(res.data)) {
      setUsers((res.data as UserData[]).filter((u: UserData) => u.role !== 'SUPER_ADMIN'))
      setLastRefreshed(new Date())
    }
    const subRes = await api.get('/api/v1/org-settings/subscription')
    if (subRes.data) {
      const d = subRes.data as any
      setEmpCap({ current: d?.currentEmployeeCount || 0, max: d?.plan?.maxEmployees ?? null })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (currentUser?.role === 'ORG_ADMIN') loadUsers()
  }, [currentUser, loadUsers])

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      searchTerm === '' ||
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const isActive = u.status === 'ACTIVE' || u.isActive
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? isActive : !isActive)
    return matchSearch && matchRole && matchStatus
  })
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openCreate = () => {
    setEditingUser(null)
    setModalMode('create')
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      panNumber: '',
      dateOfBirth: '',
      shiftStartTime: '',
      shiftEndTime: '',
      workingDays: '',
    })
    setExistingFormData({
      platformId: '',
      role: 'EMPLOYEE',
      panNumber: '',
      shiftStartTime: '',
      shiftEndTime: '',
      workingDays: '',
    })
    setShowModal(true)
    setError('')
  }

  const openEdit = (u: UserData) => {
    setEditingUser(u)
    setModalMode('create')
    setFormData({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role as any,
      panNumber: (u as any).panNumber || '',
      dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
      shiftStartTime: u.shiftStartTime || '',
      shiftEndTime: u.shiftEndTime || '',
      workingDays: u.workingDays || '',
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    if (editingUser) {
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        panNumber: formData.panNumber || null,
        dateOfBirth: formData.dateOfBirth || null,
        shiftStartTime: formData.shiftStartTime || null,
        shiftEndTime: formData.shiftEndTime || null,
        workingDays: formData.workingDays || null,
      }
      if (formData.password) updateData.password = formData.password
      const res = await api.put('/api/v1/users/' + editingUser.id, updateData)
      if (res.error) {
        const details = (res.error as any).details
        if (details && Array.isArray(details) && details.length > 0) {
          setError(details.map((d: any) => d.message).join(', '))
        } else {
          setError(res.error.message)
        }
      } else {
        setSuccess(isNp ? 'प्रयोगकर्ता अपडेट गरियो' : 'User updated')
        setShowModal(false)
        loadUsers()
        setTimeout(() => setSuccess(''), 3000)
      }
    } else {
      if (!formData.email) {
        setError(isNp ? 'इमेल आवश्यक छ' : 'Email is required')
        setSaving(false)
        return
      }
      if (!formData.firstName) {
        setError(isNp ? 'पहिलो नाम आवश्यक छ' : 'First name is required')
        setSaving(false)
        return
      }
      if (!formData.lastName) {
        setError(isNp ? 'थर आवश्यक छ' : 'Last name is required')
        setSaving(false)
        return
      }
      if (!formData.panNumber) {
        setError(isNp ? 'PAN नम्बर आवश्यक छ' : 'PAN number is required')
        setSaving(false)
        return
      }
      const { password: _pw, ...createData } = formData
      const res = await api.post('/api/v1/users', createData)
      if (res.error) {
        // Show field-specific errors from backend if available
        const details = (res.error as any).details
        if (details && Array.isArray(details) && details.length > 0) {
          setError(details.map((d: any) => d.message).join(', '))
        } else {
          setError(res.error.message)
        }
      } else {
        setShowModal(false)
        loadUsers()
        setSuccess(isNp ? 'प्रयोगकर्ता सिर्जना गरियो' : 'User created')
        setTimeout(() => setSuccess(''), 3000)
      }
    }
    setSaving(false)
  }

  const handleAddExisting = async () => {
    setSaving(true)
    setError('')
    if (!existingFormData.platformId) {
      setError(isNp ? 'प्लेटफर्म ID आवश्यक छ' : 'Platform ID is required')
      setSaving(false)
      return
    }
    const res = await api.post('/api/v1/users/add-existing', existingFormData)
    if (res.error) {
      setError(res.error.message)
    } else {
      const result = res.data as any
      setShowModal(false)
      loadUsers()
      setSuccess(
        result?.reactivated
          ? isNp
            ? 'कर्मचारी पुन: सक्रिय गरियो'
            : 'Employee reactivated successfully'
          : isNp
            ? 'कर्मचारी संगठनमा थपियो'
            : 'Employee added to organization',
      )
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  const toggleStatus = async (u: UserData) => {
    const isActive = u.status === 'ACTIVE' || u.isActive
    const res = await api.patch('/api/v1/users/' + u.id + '/status', { isActive: !isActive })
    if (res.error) {
      setError(res.error.message)
    } else {
      loadUsers()
    }
  }

  const removeUser = async (u: UserData) => {
    if (
      !confirm(
        (isNp ? 'संगठनबाट हटाउने' : 'Remove from organization: ') +
          u.firstName +
          ' ' +
          u.lastName +
          '?',
      )
    )
      return
    const res = await api.delete('/api/v1/users/' + u.id)
    if (res.error) {
      setError(res.error.message)
    } else {
      setSuccess(isNp ? 'संगठनबाट हटाइयो' : 'Removed from organization')
      loadUsers()
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

  if (!currentUser) return null

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE' || u.isActive).length,
    admins: users.filter((u) => u.role === 'ORG_ADMIN').length,
    employees: users.filter((u) => u.role === 'EMPLOYEE').length,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isNp ? 'प्रयोगकर्ता व्यवस्थापन' : 'User management'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isNp ? 'कर्मचारी र प्रशासकहरू व्यवस्थापन' : 'Manage employees and administrators'}
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
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
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

        {empCap && empCap.max !== null && empCap.current >= empCap.max && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
            <span className="text-xs font-medium text-amber-700">
              {isNp
                ? `कर्मचारी सीमा (${empCap.max}) पुगेको छ। थप कर्मचारी थप्न अपग्रेड गर्नुहोस्।`
                : `Employee limit (${empCap.max}) reached. Upgrade your plan to add more.`}
            </span>
            <a
              href="/admin/billing"
              className="ml-auto whitespace-nowrap text-xs font-semibold text-amber-800 hover:underline"
            >
              {isNp ? 'अपग्रेड' : 'Upgrade'}
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: isNp ? 'जम्मा' : 'Total',
              value: stats.total,
              icon: Users,
              bg: 'bg-slate-50',
              iconColor: 'text-slate-600',
            },
            {
              label: isNp ? 'सक्रिय' : 'Active',
              value: stats.active,
              icon: UserCheck,
              bg: 'bg-emerald-50',
              iconColor: 'text-emerald-600',
            },
            {
              label: isNp ? 'प्रशासक' : 'Admins',
              value: stats.admins,
              icon: Shield,
              bg: 'bg-slate-100',
              iconColor: 'text-slate-900',
            },
            {
              label: isNp ? 'कर्मचारी' : 'Employees',
              value: stats.employees,
              icon: User,
              bg: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={`inline-flex rounded-lg p-2 ${s.bg} mb-3`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <div className="text-xl font-semibold tracking-tight text-slate-900">{s.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {isNp ? 'प्रयोगकर्ता सूची' : 'User list'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isNp ? 'सबै प्रयोगकर्ताहरूको सूची' : 'All users in your organization'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {empCap && empCap.max !== null && (
                <span
                  className={
                    'text-xs font-medium ' +
                    (empCap.current >= empCap.max
                      ? 'text-red-600'
                      : empCap.current >= empCap.max - 1
                        ? 'text-amber-600'
                        : 'text-slate-500')
                  }
                >
                  {empCap.current}/{empCap.max} {isNp ? 'कर्मचारी' : 'employees'}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowRosterMenu(!showRosterMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isNp ? 'रोस्टर' : 'Roster'}
                </button>
                {showRosterMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      {isNp ? 'अवधि' : 'Period'}
                    </label>
                    <div className="mb-3 flex gap-1.5">
                      {(
                        [
                          { value: 'weekly', en: 'Weekly', np: 'साप्ताहिक' },
                          { value: 'fortnightly', en: '2 Weeks', np: '२ हप्ता' },
                          { value: 'monthly', en: 'Monthly', np: 'मासिक' },
                        ] as const
                      ).map(({ value, en, np }) => (
                        <button
                          key={value}
                          onClick={() => setRosterPeriod(value)}
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                            rosterPeriod === value
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {isNp ? np : en}
                        </button>
                      ))}
                    </div>
                    <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={rosterIncludeTime}
                        onChange={(e) => setRosterIncludeTime(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      {isNp ? 'शिफ्ट समय देखाउनुहोस्' : 'Include shift times'}
                    </label>
                    <button
                      onClick={async () => {
                        setShowRosterMenu(false)
                        const url =
                          (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001') +
                          `/api/v1/reports/roster?period=${rosterPeriod}&includeTime=${rosterIncludeTime}`
                        try {
                          const res = await fetch(url, {
                            credentials: 'include',
                            headers: { 'X-Requested-With': 'XMLHttpRequest' },
                          })
                          if (!res.ok) throw new Error('Failed to generate roster')
                          const blob = await res.blob()
                          const blobUrl = URL.createObjectURL(blob)
                          window.open(blobUrl, '_blank')
                        } catch {
                          setError(isNp ? 'रोस्टर बनाउन सकिएन' : 'Could not generate roster')
                        }
                      }}
                      className="w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      {isNp ? 'PDF डाउनलोड' : 'Download PDF'}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={openCreate}
                disabled={empCap !== null && empCap.max !== null && empCap.current >= empCap.max}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isNp ? 'नयाँ प्रयोगकर्ता' : 'New user'}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder={isNp ? 'नाम, इमेल, ID खोज्नुहोस्...' : 'Search name, email, ID...'}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">{isNp ? 'सबै भूमिका' : 'All roles'}</option>
              <option value="ORG_ADMIN">{isNp ? 'प्रशासक' : 'Admin'}</option>
              <option value="ORG_ACCOUNTANT">{isNp ? 'लेखापाल' : 'Accountant'}</option>
              <option value="EMPLOYEE">{isNp ? 'कर्मचारी' : 'Employee'}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">{isNp ? 'सबै स्थिति' : 'All status'}</option>
              <option value="ACTIVE">{isNp ? 'सक्रिय' : 'Active'}</option>
              <option value="INACTIVE">{isNp ? 'निष्क्रिय' : 'Inactive'}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'इमेल' : 'Email'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'भूमिका' : 'Role'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'स्थिति' : 'Status'}
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:table-cell">
                    {isNp ? 'शिफ्ट' : 'Shift'}
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isNp ? 'कार्य' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const isActive = u.status === 'ACTIVE' || u.isActive
                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
                            <span className="text-xs font-medium text-slate-700">
                              {u.firstName[0]}
                              {u.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div
                              className="cursor-pointer text-sm font-medium text-slate-900 transition-colors hover:text-blue-600"
                              onClick={() => router.push(`/users/${u.id}`)}
                            >
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-xs text-slate-400">{u.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            u.role === 'ORG_ADMIN'
                              ? 'inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-900'
                              : u.role === 'ORG_ACCOUNTANT'
                                ? 'inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700'
                                : 'inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700'
                          }
                        >
                          {u.role === 'ORG_ADMIN'
                            ? isNp
                              ? 'प्रशासक'
                              : 'Admin'
                            : u.role === 'ORG_ACCOUNTANT'
                              ? isNp
                                ? 'लेखापाल'
                                : 'Accountant'
                              : isNp
                                ? 'कर्मचारी'
                                : 'Employee'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleStatus(u)}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          <span
                            className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-rose-700'}`}
                          >
                            {isActive
                              ? isNp
                                ? 'सक्रिय'
                                : 'Active'
                              : isNp
                                ? 'निष्क्रिय'
                                : 'Inactive'}
                          </span>
                        </button>
                      </td>
                      <td className="hidden px-5 py-3 lg:table-cell">
                        {u.shiftStartTime && u.shiftEndTime ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                            {u.shiftStartTime} - {u.shiftEndTime}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {isNp ? 'पूर्वनिर्धारित' : 'Default'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(u)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title={isNp ? 'सम्पादन' : 'Edit'}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/users/${u.id}`)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title={isNp ? 'कागजात' : 'Documents'}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeUser(u)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title={isNp ? 'संगठनबाट हटाउनुहोस्' : 'Remove'}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="mb-1 text-sm font-medium text-slate-900">
                        {isNp ? 'कुनै प्रयोगकर्ता भेटिएन' : 'No users found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isNp
                          ? 'नयाँ प्रयोगकर्ता थप्न माथिको बटन प्रयोग गर्नुहोस्'
                          : 'Add a new user to get started'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">
                  {isNp
                    ? `${filteredUsers.length} मध्ये ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} देखाइएको`
                    : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of ${filteredUsers.length}`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isNp ? 'अघिल्लो' : 'Previous'}
                  </button>
                  <span className="px-3 py-1.5 text-xs text-slate-500">
                    {isNp ? `${currentPage} / ${totalPages}` : `${currentPage} of ${totalPages}`}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isNp ? 'अर्को' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EmployeeDetailModal
        isOpen={!!docUserId}
        onClose={() => setDocUserId(null)}
        user={users.find((u) => u.id === docUserId) || null}
        language={language}
      />

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 p-4 pt-10">
          <div className="mb-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-slate-100 p-1.5">
                  {editingUser ? (
                    <Edit className="h-4 w-4 text-slate-600" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {editingUser
                      ? isNp
                        ? 'प्रयोगकर्ता सम्पादन'
                        : 'Edit user'
                      : isNp
                        ? 'प्रयोगकर्ता थप्नुहोस्'
                        : 'Add user'}
                  </h2>
                  {!editingUser && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {isNp
                        ? 'नयाँ सिर्जना गर्नुहोस् वा प्लेटफर्म ID बाट थप्नुहोस्'
                        : 'Create new or add by Platform ID'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!editingUser && (
              <div className="px-5 pt-4">
                <div className="flex rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => {
                      setModalMode('create')
                      setError('')
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${modalMode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isNp ? 'नयाँ सिर्जना' : 'Create new'}
                  </button>
                  <button
                    onClick={() => {
                      setModalMode('existing')
                      setError('')
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${modalMode === 'existing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Link className="h-3.5 w-3.5" />
                    {isNp ? 'प्लेटफर्म ID बाट' : 'Add existing'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4 p-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* CREATE / EDIT FORM */}
              {(modalMode === 'create' || editingUser) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        {isNp ? 'पहिलो नाम' : 'First name'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        {isNp ? 'थर' : 'Last name'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        {isNp ? 'इमेल' : 'Email'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {editingUser && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        {isNp ? 'नयाँ पासवर्ड (ऐच्छिक)' : 'New password (optional)'}
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={isNp ? 'खाली छोड्नुहोस्' : 'Leave blank to keep'}
                          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'PAN नम्बर' : 'PAN number'}
                      {!editingUser && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                      placeholder={isNp ? 'PAN नम्बर...' : 'PAN number...'}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  {/* DATE OF BIRTH */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'जन्म मिति (ऐच्छिक)' : 'Date of birth (optional)'}
                    </label>
                    <BSDatePicker
                      value={formData.dateOfBirth}
                      onChange={(val) => setFormData({ ...formData, dateOfBirth: val })}
                      max={new Date().toISOString().split('T')[0]}
                      placeholder={isNp ? 'मिति छान्नुहोस्' : 'Select date'}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'भूमिका' : 'Role'}
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="EMPLOYEE">{isNp ? 'कर्मचारी' : 'Employee'}</option>
                      <option value="ORG_ACCOUNTANT">{isNp ? 'लेखापाल' : 'Accountant'}</option>
                      <option value="ORG_ADMIN">{isNp ? 'प्रशासक' : 'Admin'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'कार्य समय (ऐच्छिक)' : 'Work shift (optional)'}
                    </label>
                    <p className="mb-2 text-xs text-slate-400">
                      {isNp
                        ? 'खाली छोड्नुभयो भने संगठनको पूर्वनिर्धारित समय लागू हुन्छ'
                        : 'Leave empty to use organization default schedule'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          {isNp ? 'सुरु' : 'Start'}
                        </label>
                        <input
                          type="time"
                          value={formData.shiftStartTime}
                          onChange={(e) =>
                            setFormData({ ...formData, shiftStartTime: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          {isNp ? 'अन्त्य' : 'End'}
                        </label>
                        <input
                          type="time"
                          value={formData.shiftEndTime}
                          onChange={(e) =>
                            setFormData({ ...formData, shiftEndTime: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Per-Employee Working Days */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500">
                      {isNp ? 'कार्य दिनहरू (कर्मचारी)' : 'Working Days (Employee)'}
                    </label>
                    <p className="mb-2 text-xs text-slate-400">
                      {isNp
                        ? 'खाली छोड्नुभयो भने संगठनको पूर्वनिर्धारित दिन लागू हुन्छ'
                        : 'Leave empty to use organization default'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { day: 0, en: 'Sun', np: 'आइत' },
                        { day: 1, en: 'Mon', np: 'सोम' },
                        { day: 2, en: 'Tue', np: 'मंगल' },
                        { day: 3, en: 'Wed', np: 'बुध' },
                        { day: 4, en: 'Thu', np: 'बिहि' },
                        { day: 5, en: 'Fri', np: 'शुक्र' },
                        { day: 6, en: 'Sat', np: 'शनि' },
                      ].map(({ day, en, np }) => {
                        const activeDays = formData.workingDays
                          ? formData.workingDays.split(',').map(Number)
                          : []
                        const isActive = activeDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const current = formData.workingDays
                                ? formData.workingDays.split(',').map(Number)
                                : []
                              const updated = isActive
                                ? current.filter((d) => d !== day)
                                : [...current, day].sort()
                              setFormData({
                                ...formData,
                                workingDays: updated.length > 0 ? updated.join(',') : '',
                              })
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                              isActive
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {isNp ? np : en}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {!editingUser && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                      {isNp
                        ? 'हाजिरी PIN स्वचालित रूपमा उत्पन्न हुनेछ'
                        : 'Attendance PIN will be auto-generated'}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      {isNp ? 'रद्द' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving
                        ? isNp
                          ? 'सुरक्षित गर्दै...'
                          : 'Saving...'
                        : editingUser
                          ? isNp
                            ? 'अपडेट'
                            : 'Update'
                          : isNp
                            ? 'सिर्जना'
                            : 'Create'}
                    </button>
                  </div>
                </>
              )}

              {/* ADD EXISTING FORM */}
              {modalMode === 'existing' && !editingUser && (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs leading-relaxed text-blue-700">
                      {isNp
                        ? 'कर्मचारीको ८ अंकको प्लेटफर्म ID प्रविष्ट गर्नुहोस्। उनीहरूको अवस्थित खाता तपाईंको संगठनमा लिंक हुनेछ।'
                        : "Enter the employee's 8-digit Platform ID. Their existing account will be linked to your organization."}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'प्लेटफर्म ID' : 'Platform ID'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={existingFormData.platformId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                          setExistingFormData({ ...existingFormData, platformId: val })
                        }}
                        placeholder="12345678"
                        maxLength={8}
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {isNp
                        ? 'कर्मचारीले आफ्नो प्रोफाइलमा प्लेटफर्म ID पाउन सक्छन्'
                        : 'Employee can find their Platform ID in their profile'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'भूमिका' : 'Role'}
                    </label>
                    <select
                      value={existingFormData.role}
                      onChange={(e) =>
                        setExistingFormData({ ...existingFormData, role: e.target.value as any })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="EMPLOYEE">{isNp ? 'कर्मचारी' : 'Employee'}</option>
                      <option value="ORG_ACCOUNTANT">{isNp ? 'लेखापाल' : 'Accountant'}</option>
                      <option value="ORG_ADMIN">{isNp ? 'प्रशासक' : 'Admin'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'PAN नम्बर' : 'PAN number'}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={existingFormData.panNumber}
                      onChange={(e) =>
                        setExistingFormData({ ...existingFormData, panNumber: e.target.value })
                      }
                      placeholder={isNp ? 'PAN नम्बर...' : 'PAN number...'}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {isNp ? 'कार्य समय (ऐच्छिक)' : 'Work shift (optional)'}
                    </label>
                    <p className="mb-2 text-xs text-slate-400">
                      {isNp
                        ? 'खाली छोड्नुभयो भने संगठनको पूर्वनिर्धारित समय लागू हुन्छ'
                        : 'Leave empty to use organization default schedule'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          {isNp ? 'सुरु' : 'Start'}
                        </label>
                        <input
                          type="time"
                          value={existingFormData.shiftStartTime}
                          onChange={(e) =>
                            setExistingFormData({
                              ...existingFormData,
                              shiftStartTime: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          {isNp ? 'अन्त्य' : 'End'}
                        </label>
                        <input
                          type="time"
                          value={existingFormData.shiftEndTime}
                          onChange={(e) =>
                            setExistingFormData({
                              ...existingFormData,
                              shiftEndTime: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Per-Employee Working Days */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500">
                      {isNp ? 'कार्य दिनहरू (कर्मचारी)' : 'Working Days (Employee)'}
                    </label>
                    <p className="mb-2 text-xs text-slate-400">
                      {isNp
                        ? 'खाली छोड्नुभयो भने संगठनको पूर्वनिर्धारित दिन लागू हुन्छ'
                        : 'Leave empty to use organization default'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { day: 0, en: 'Sun', np: 'आइत' },
                        { day: 1, en: 'Mon', np: 'सोम' },
                        { day: 2, en: 'Tue', np: 'मंगल' },
                        { day: 3, en: 'Wed', np: 'बुध' },
                        { day: 4, en: 'Thu', np: 'बिहि' },
                        { day: 5, en: 'Fri', np: 'शुक्र' },
                        { day: 6, en: 'Sat', np: 'शनि' },
                      ].map(({ day, en, np }) => {
                        const activeDays = existingFormData.workingDays
                          ? existingFormData.workingDays.split(',').map(Number)
                          : []
                        const isActive = activeDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const current = existingFormData.workingDays
                                ? existingFormData.workingDays.split(',').map(Number)
                                : []
                              const updated = isActive
                                ? current.filter((d) => d !== day)
                                : [...current, day].sort()
                              setExistingFormData({
                                ...existingFormData,
                                workingDays: updated.length > 0 ? updated.join(',') : '',
                              })
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                              isActive
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {isNp ? np : en}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      {isNp ? 'रद्द' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleAddExisting}
                      disabled={saving || existingFormData.platformId.length !== 8}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Link className="h-3.5 w-3.5" />
                      {saving
                        ? isNp
                          ? 'थप्दै...'
                          : 'Adding...'
                        : isNp
                          ? 'संगठनमा थप्नुहोस्'
                          : 'Add to organization'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
