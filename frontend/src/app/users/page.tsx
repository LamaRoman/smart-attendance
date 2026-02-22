'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { FileText,
  Users, UserPlus, Search, Edit, Trash2, Shield, UserCheck,
  CheckCircle, XCircle, Save, Key, Mail, User, X, AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface UserData {
  id: string; email: string; firstName: string; lastName: string;
  employeeId: string; role: string; isActive: boolean; status?: string;
  createdAt: string;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

export default function UsersPage() {
  const { user: currentUser, isLoading, language } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ORG_ADMIN' | 'EMPLOYEE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [docUserId, setDocUserId] = useState<string | null>(null);
  const [docUserName, setDocUserName] = useState("");
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [empCap, setEmpCap] = useState<{ current: number; max: number } | null>(null);

  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '',
    role: 'EMPLOYEE' as 'ORG_ADMIN' | 'EMPLOYEE',
    shiftStartTime: '',
    shiftEndTime: '',
  });

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'ORG_ADMIN')) router.push('/login');
  }, [currentUser, isLoading, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/users');
    if (res.data && Array.isArray(res.data)) {
      setUsers((res.data as UserData[]).filter((u: UserData) => u.role !== 'SUPER_ADMIN'));
      setLastRefreshed(new Date());
    }
    const subRes = await api.get("/api/org-settings/subscription");
    if (subRes.data) {
      const d = subRes.data as any;
      setEmpCap({ current: d?.currentEmployeeCount || 0, max: d?.plan?.maxEmployees || 5 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'ORG_ADMIN') loadUsers();
  }, [currentUser, loadUsers]);

  const filteredUsers = users.filter((u) => {
    const matchSearch = searchTerm === '' ||
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const isActive = u.status === 'ACTIVE' || u.isActive;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? isActive : !isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', shiftStartTime: '', shiftEndTime: '' });
    setShowModal(true);
    setError('');
  };

  const openEdit = (u: UserData) => {
    setEditingUser(u);
    setFormData({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, role: u.role as any, shiftStartTime: u.shiftStartTime || '', shiftEndTime: u.shiftEndTime || '' });
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    if (editingUser) {
      const updateData: any = { firstName: formData.firstName, lastName: formData.lastName, role: formData.role, shiftStartTime: formData.shiftStartTime || null, shiftEndTime: formData.shiftEndTime || null };
      if (formData.password) updateData.password = formData.password;
      const res = await api.put('/api/users/' + editingUser.id, updateData);
      if (res.error) { setError(res.error.message); }
      else {
        setSuccess(isNp ? 'प्रयोगकर्ता अपडेट गरियो' : 'User updated');
        setShowModal(false); loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } else {
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        setError(isNp ? 'सबै फिल्ड भर्नुहोस्' : 'All fields are required');
        setSaving(false); return;
      }
      const res = await api.post('/api/users', formData);
      if (res.error) { setError(res.error.message); }
      else {
        setSuccess(isNp ? 'प्रयोगकर्ता सिर्जना गरियो' : 'User created');
        setShowModal(false); loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    }
    setSaving(false);
  };

  const toggleStatus = async (u: UserData) => {
    const isActive = u.status === 'ACTIVE' || u.isActive;
    const res = await api.patch('/api/users/' + u.id + '/status', { isActive: !isActive });
    if (res.error) { setError(res.error.message); }
    else { loadUsers(); }
  };

  const deleteUser = async (u: UserData) => {
    if (!confirm((isNp ? 'मेटाउने: ' : 'Delete: ') + u.firstName + ' ' + u.lastName + '?')) return;
    const res = await api.delete('/api/users/' + u.id);
    if (res.error) { setError(res.error.message); }
    else {
      setSuccess(isNp ? 'प्रयोगकर्ता मेटाइयो' : 'User deleted');
      loadUsers();
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

  if (!currentUser) return null;

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE' || u.isActive).length,
    admins: users.filter((u) => u.role === 'ORG_ADMIN').length,
    employees: users.filter((u) => u.role === 'EMPLOYEE').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with title and refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'प्रयोगकर्ता व्यवस्थापन' : 'User management'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'कर्मचारी र प्रशासकहरू व्यवस्थापन' : 'Manage employees and administrators'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                {isNp ? 'पछिल्लो अपडेट:' : 'Updated'}{' '}
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts - Minimal */}
        {error && (
          <div className="flex items-center justify-between p-3.5 bg-rose-50 rounded-lg border border-rose-200">
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
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">{success}</span>
          </div>
        )}
        {empCap && empCap.current >= empCap.max && (
          <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-xs font-medium text-amber-700">{isNp ? `कर्मचारी सीमा (${empCap.max}) पुगेको छ। थप कर्मचारी थप्न अपग्रेड गर्नुहोस्।` : `Employee limit (${empCap.max}) reached. Upgrade your plan to add more.`}</span>
            <a href="/admin/billing" className="ml-auto text-xs font-semibold text-amber-800 hover:underline whitespace-nowrap">{isNp ? "अपग्रेड" : "Upgrade"}</a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: isNp ? 'जम्मा' : 'Total', value: stats.total, icon: Users, bg: 'bg-slate-50', iconColor: 'text-slate-600' },
            { label: isNp ? 'सक्रिय' : 'Active', value: stats.active, icon: UserCheck, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: isNp ? 'प्रशासक' : 'Admins', value: stats.admins, icon: Shield, bg: 'bg-slate-100', iconColor: 'text-slate-900' },
            { label: isNp ? 'कर्मचारी' : 'Employees', value: stats.employees, icon: User, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="text-xl font-semibold text-slate-900 tracking-tight">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Header + Search + Filters - Clean card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {isNp ? 'प्रयोगकर्ता सूची' : 'User list'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNp ? 'सबै प्रयोगकर्ताहरूको सूची' : 'All users in your organization'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {empCap && <span className={"text-xs font-medium " + (empCap.current >= empCap.max ? "text-red-600" : empCap.current >= empCap.max - 1 ? "text-amber-600" : "text-slate-500")}>{empCap.current}/{empCap.max} {isNp ? "कर्मचारी" : "employees"}</span>}
              <button
                onClick={openCreate}
                disabled={empCap !== null && empCap.current >= empCap.max}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isNp ? "नयाँ प्रयोगकर्ता" : "New user"}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isNp ? 'नाम, इमेल, ID खोज्नुहोस्...' : 'Search name, email, ID...'}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
              />
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              <option value="ALL">{isNp ? 'सबै भूमिका' : 'All roles'}</option>
              <option value="ORG_ADMIN">{isNp ? 'प्रशासक' : 'Admin'}</option>
              <option value="EMPLOYEE">{isNp ? 'कर्मचारी' : 'Employee'}</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            >
              <option value="ALL">{isNp ? 'सबै स्थिति' : 'All status'}</option>
              <option value="ACTIVE">{isNp ? 'सक्रिय' : 'Active'}</option>
              <option value="INACTIVE">{isNp ? 'निष्क्रिय' : 'Inactive'}</option>
            </select>
          </div>
        </div>

        {/* Users Table - Clean */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNp ? 'कर्मचारी' : 'Employee'}
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNp ? 'इमेल' : 'Email'}
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNp ? 'भूमिका' : 'Role'}
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNp ? 'स्थिति' : 'Status'}
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                    {isNp ? 'शिफ्ट' : 'Shift'}
                  </th>
                  <th className="text-right py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {isNp ? 'कार्य' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isActive = u.status === 'ACTIVE' || u.isActive;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-slate-700">
                              {u.firstName[0]}{u.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => router.push(`/users/${u.id}`)}>{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-slate-400">{u.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-600">{u.email}</td>
                      <td className="py-3 px-5">
                        <span className={u.role === 'ORG_ADMIN'
                          ? 'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-900'
                          : 'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700'
                        }>
                          {u.role === 'ORG_ADMIN' ? (isNp ? 'प्रशासक' : 'Admin') : (isNp ? 'कर्मचारी' : 'Employee')}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <button 
                          onClick={() => toggleStatus(u)}
                          className="flex items-center gap-1.5"
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span className={`text-xs font-medium ${
                            isActive ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isActive ? (isNp ? 'सक्रिय' : 'Active') : (isNp ? 'निष्क्रिय' : 'Inactive')}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-5 hidden lg:table-cell">
                        {u.shiftStartTime && u.shiftEndTime ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                            {u.shiftStartTime} - {u.shiftEndTime}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{isNp ? 'पूर्वनिर्धारित' : 'Default'}</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEdit(u)} 
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => router.push(`/users/${u.id}`)} 
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" 
                            title="Documents" 
                          > 
                            <FileText className="w-3.5 h-3.5" /> 
                          </button>
                          <button 
                            onClick={() => deleteUser(u)} 
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 px-5 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {isNp ? 'कुनै प्रयोगकर्ता भेटिएन' : 'No users found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isNp ? 'नयाँ प्रयोगकर्ता थप्न माथिको बटन प्रयोग गर्नुहोस्' : 'Add a new user to get started'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EmployeeDetailModal isOpen={!!docUserId} onClose={() => setDocUserId(null)} user={users.find(u => u.id === docUserId) || null} language={language} />
      {/* Create/Edit Modal - Clean */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-slate-200">
            {/* Modal Header - No gradients */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  {editingUser ? (
                    <Edit className="w-4 h-4 text-slate-600" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {editingUser ? (isNp ? 'प्रयोगकर्ता सम्पादन' : 'Edit user') : (isNp ? 'नयाँ प्रयोगकर्ता' : 'New user')}
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
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {isNp ? 'पहिलो नाम' : 'First name'} <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {isNp ? 'थर' : 'Last name'} <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {isNp ? 'इमेल' : 'Email'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {editingUser ? (isNp ? 'नयाँ पासवर्ड (ऐच्छिक)' : 'New password (optional)') : (isNp ? 'पासवर्ड' : 'Password')}
                  {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? (isNp ? 'खाली छोड्नुहोस्' : 'Leave blank to keep') : ''}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'भूमिका' : 'Role'}
                </label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                >
                  <option value="EMPLOYEE">{isNp ? 'कर्मचारी' : 'Employee'}</option>
                  <option value="ORG_ADMIN">{isNp ? 'प्रशासक' : 'Admin'}</option>
                </select>
              </div>

              {/* Shift Override */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isNp ? 'कार्य समय (ऐच्छिक)' : 'Work shift (optional)'}
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  {isNp ? 'खाली छोड्नुभयो भने संगठनको पूर्वनिर्धारित समय लागू हुन्छ' : 'Leave empty to use organization default schedule'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{isNp ? 'सुरु' : 'Start'}</label>
                    <input
                      type="time"
                      value={formData.shiftStartTime}
                      onChange={(e) => setFormData({ ...formData, shiftStartTime: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{isNp ? 'अन्त्य' : 'End'}</label>
                    <input
                      type="time"
                      value={formData.shiftEndTime}
                      onChange={(e) => setFormData({ ...formData, shiftEndTime: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={saving}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? (isNp ? 'सुरक्षित गर्दै...' : 'Saving...') : editingUser ? (isNp ? 'अपडेट' : 'Update') : (isNp ? 'सिर्जना' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}