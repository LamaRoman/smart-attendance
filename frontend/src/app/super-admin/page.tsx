'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Shield, Building, Users, Plus, LogOut, CheckCircle, XCircle,
  AlertCircle, X, Trash2, ToggleLeft, ToggleRight, Globe, Calendar,
  CreditCard, CalendarDays, FileText, QrCode, RefreshCw, ChevronDown,
  ChevronUp, Activity, Zap, Search, CalendarCheck, ArrowRight, Mail,
  Phone, MapPin, UserPlus, UsersRound, Clock, BarChart3, Calculator,
  ChevronRight,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  staticQREnabled: boolean;
  rotatingQREnabled: boolean;
  calendarMode: 'NEPALI' | 'ENGLISH';
  language: 'NEPALI' | 'ENGLISH';
  createdAt: string;
  stats: {
    totalUsers: number;
    totalEmployees: number;
    totalAdmins: number;
    totalAttendanceRecords: number;
    employeesWithPayroll: number;
  };
}

interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalAttendanceRecords: number;
  totalMasterHolidays?: number;
  totalEmployees?: number;
  totalAdmins?: number;
}

interface CreateOrgForm {
  name: string; email: string; phone: string; address: string;
  adminEmail: string; adminPassword: string; adminFirstName: string; adminLastName: string;
}

const FEATURE_CONFIG = [
  { key: 'staticQREnabled', label: 'Static QR', icon: QrCode },
  { key: 'rotatingQREnabled', label: 'Rotating QR', icon: RefreshCw },
];

export default function SuperAdminPage() {
  const { user, isLoading, logout, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [createForm, setCreateForm] = useState<CreateOrgForm>({
    name: '', email: '', phone: '', address: '',
    adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
  });

  useEffect(() => {
    if (!isLoading && (!user || !isSuperAdmin)) router.push('/login');
  }, [user, isLoading, isSuperAdmin, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [orgsRes, statsRes, holidaysRes] = await Promise.all([
      api.get('/api/super-admin/organizations'),
      api.get('/api/super-admin/stats'),
      api.get('/api/master-holidays?bsYear=2082'),
    ]);
    if (orgsRes.data) {
      const d = orgsRes.data as Record<string, unknown>;
      setOrganizations((d.organizations || []) as Organization[]);
    }
    if (statsRes.data) {
      const d = statsRes.data as Record<string, unknown>;
      const s = d.stats as Record<string, Record<string, number>>;
      if (s) {
        const baseStats = {
          totalOrganizations: s.organizations?.total || 0,
          activeOrganizations: s.organizations?.active || 0,
          totalUsers: s.users?.total || 0,
          totalEmployees: s.users?.employees || 0,
          totalAdmins: s.users?.orgAdmins || 0,
          totalAttendanceRecords: s.attendance?.totalRecords || 0,
        };
        if (holidaysRes.data) {
          const hd = holidaysRes.data as Record<string, unknown>;
          const holidays = (hd.holidays || []) as Array<unknown>;
          setStats({ ...baseStats, totalMasterHolidays: holidays.length });
        } else {
          setStats(baseStats);
        }
      }
    }
    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isSuperAdmin) loadData();
  }, [user, isSuperAdmin, loadData]);

  const handleCreateOrg = async () => {
    if (!createForm.name || !createForm.adminEmail || !createForm.adminPassword || !createForm.adminFirstName || !createForm.adminLastName) {
      setError('Please fill in all required fields'); return;
    }
    setLoading(true); setError('');
    const res = await api.post('/api/super-admin/organizations', createForm);
    if (res.error) { setError(res.error.message); }
    else {
      setSuccess('Organization created successfully');
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', address: '', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    }
    setLoading(false);
  };

  const toggleOrgStatus = async (orgId: string) => {
    const res = await api.patch('/api/super-admin/organizations/' + orgId + '/toggle-status');
    if (res.error) { setError(res.error.message); }
    else { loadData(); setSuccess('Organization status updated'); setTimeout(() => setSuccess(''), 3000); }
  };

  const toggleOrgFeature = async (orgId: string, field: string, current: boolean) => {
    const res = await api.patch(`/api/super-admin/organizations/${orgId}`, { [field]: !current });
    if (res.error) { setError(res.error.message); }
    else { loadData(); setSuccess('Feature updated'); setTimeout(() => setSuccess(''), 3000); }
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm('Delete "' + orgName + '"? This cannot be undone.')) return;
    const res = await api.delete('/api/super-admin/organizations/' + orgId);
    if (res.error) { setError(res.error.message); }
    else { setSuccess('Organization deleted'); loadData(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }
  if (!user || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-white">

      {/* Header — Stripe-style: white, thin border, compact */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-900" />
              <span className="text-sm font-semibold text-slate-900">Super Admin</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">Platform Management</span>
            </div>
            <div className="flex items-center gap-1">
              {lastRefreshed && (
                <span className="text-xs text-slate-400 mr-2">
                  Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={loadData} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button onClick={() => router.push('/super-admin/holidays')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
                <CalendarCheck className="w-3.5 h-3.5" />
                Holidays
              </button>
              <button onClick={() => router.push('/super-admin/tds-slabs')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
                <Calculator className="w-3.5 h-3.5" />
                TDS Slabs
              </button>
              <button onClick={() => router.push('/super-admin/subscriptions')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
                <CreditCard className="w-3.5 h-3.5" />
                Subscriptions
              </button>
              <button onClick={() => router.push('/super-admin/plans')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors">
                <ToggleRight className="w-3.5 h-3.5" />
                Feature Flags
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-center justify-between px-4 py-3 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5 text-rose-400" /></button>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}

        {/* Stats — Stripe-style horizontal metric strip */}
        {stats && (
          <div className="grid grid-cols-7 gap-0 mb-8 border border-slate-200 rounded-xl overflow-hidden">
            {[
              { label: 'Organizations', value: stats.totalOrganizations, icon: Building },
              { label: 'Active', value: stats.activeOrganizations, icon: Activity },
              { label: 'Total Users', value: stats.totalUsers, icon: Users },
              { label: 'Employees', value: stats.totalEmployees ?? 0, icon: UsersRound },
              { label: 'Org Admins', value: stats.totalAdmins ?? 0, icon: Shield },
              { label: 'Attendance', value: stats.totalAttendanceRecords, icon: Zap },
              { label: 'Holidays', value: stats.totalMasterHolidays || 0, icon: CalendarCheck },
            ].map((s, i) => (
              <div key={s.label} className={`px-5 py-4 bg-white ${i < 6 ? 'border-r border-slate-200' : ''}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <s.icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
                </div>
                <p className="text-xl font-semibold text-slate-900 tracking-tight">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Organizations</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              {filteredOrgs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations..."
                className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 w-64"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Organization
            </button>
          </div>
        </div>

        {/* Organization Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="col-span-4 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Organization</div>
            <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Users</div>
            <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Features</div>
            <div className="col-span-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Created</div>
            <div className="col-span-1 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Status</div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filteredOrgs.map((org) => {
              const isExpanded = expandedOrg === org.id;
              return (
                <div key={org.id}>
                  {/* Main row */}
                  <div
                    className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                  >
                    {/* Name + email */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${org.isActive ? 'bg-slate-900' : 'bg-slate-300'}`}>
                          <Building className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                          <p className="text-xs text-slate-400 truncate">{org.email || '—'}</p>
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
                        const enabled = (org as Record<string, unknown>)[f.key] as boolean;
                        return (
                          <span key={f.key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <f.icon className="w-2.5 h-2.5" />
                            {f.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Created */}
                    <div className="col-span-2">
                      <p className="text-xs text-slate-600">{new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${org.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${org.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Expand */}
                    <div className="col-span-1 flex justify-end">
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5">
                      <div className="grid grid-cols-3 gap-6">

                        {/* Statistics */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Statistics</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Total Users', value: org.stats.totalUsers },
                              { label: 'Org Admins', value: org.stats.totalAdmins },
                              { label: 'Employees', value: org.stats.totalEmployees },
                              { label: 'Attendance Records', value: org.stats.totalAttendanceRecords },
                            ].map((row) => (
                              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0">
                                <span className="text-xs text-slate-500">{row.label}</span>
                                <span className="text-xs font-semibold text-slate-900">{row.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Details */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Language', value: org.language === 'NEPALI' ? 'Nepali' : 'English' },
                              { label: 'Calendar', value: org.calendarMode === 'NEPALI' ? 'Bikram Sambat' : 'Gregorian' },
                              { label: 'Phone', value: org.phone || '—' },
                              { label: 'Address', value: org.address || '—' },
                            ].map((row) => (
                              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0">
                                <span className="text-xs text-slate-500">{row.label}</span>
                                <span className="text-xs font-medium text-slate-900 text-right max-w-36 truncate">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Features + Actions */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Features</p>
                          <div className="space-y-2 mb-4">
                            {FEATURE_CONFIG.map((f) => {
                              const enabled = (org as Record<string, unknown>)[f.key] as boolean;
                              return (
                                <button
                                  key={f.key}
                                  onClick={(e) => { e.stopPropagation(); toggleOrgFeature(org.id, f.key, enabled); }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${enabled ? 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <f.icon className={`w-3.5 h-3.5 ${enabled ? 'text-slate-700' : 'text-slate-300'}`} />
                                    {f.label}
                                  </div>
                                  <span className={`text-[10px] font-bold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {enabled ? 'ON' : 'OFF'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOrgStatus(org.id); }}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${org.isActive ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                            >
                              {org.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {org.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOrg(org.id, org.name); }}
                              className="px-3 py-2 rounded-lg text-xs font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOrgs.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Building className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 mb-1">No organizations found</p>
                <p className="text-xs text-slate-500 mb-4">Try adjusting your search or create a new organization</p>
                <button onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  New Organization
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Create Organization</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add a new organization to the platform</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Organization Details</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-rose-500">*</span></label>
                    <input type="text" value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Acme Corporation"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input type="email" value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="info@company.com"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                      <input type="text" value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        placeholder="+977 1 2345678"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                    <input type="text" value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      placeholder="Kathmandu, Nepal"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Admin Account</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">First Name <span className="text-rose-500">*</span></label>
                      <input type="text" value={createForm.adminFirstName}
                        onChange={(e) => setCreateForm({ ...createForm, adminFirstName: e.target.value })}
                        placeholder="John"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Last Name <span className="text-rose-500">*</span></label>
                      <input type="text" value={createForm.adminLastName}
                        onChange={(e) => setCreateForm({ ...createForm, adminLastName: e.target.value })}
                        placeholder="Doe"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Admin Email <span className="text-rose-500">*</span></label>
                    <input type="email" value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      placeholder="admin@company.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password <span className="text-rose-500">*</span></label>
                    <input type="password" value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    <p className="text-[10px] text-slate-400 mt-1">Min 8 characters, 1 uppercase, 1 lowercase, 1 number</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateOrg} disabled={loading}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</> : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
