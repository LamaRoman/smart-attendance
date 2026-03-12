'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AdminLayout from '@/components/AdminLayout';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import DocumentTypeManager from '@/components/DocumentTypeManager';

import {
  ArrowLeft,
  LogOut,
  Settings,
  Globe,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  Shield,
  X,
  Languages,
  RefreshCw,
  Check,
  LocateFixed,
  Compass,
  Clock,
} from 'lucide-react';

const GeofenceMap = dynamic(
  () => import('@/components/GeoFenceMap'),
  { ssr: false }
);

interface OrgSettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  calendarMode: 'NEPALI' | 'ENGLISH';
  language: 'NEPALI' | 'ENGLISH';
  isActive: boolean;
}

export default function OrgSettingsPage() {
  const { user, isLoading, logout, isAdmin, language: currentLang, refreshUser } = useAuth();
  const router = useRouter();
  const isNepali = currentLang === 'NEPALI';

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'NEPALI' as 'NEPALI' | 'ENGLISH',
    calendarMode: 'NEPALI' as 'NEPALI' | 'ENGLISH',
    geofenceEnabled: false,
    officeLat: '',
    officeLng: '',
    geofenceRadius: 100,
    attendanceMode: 'QR_ONLY' as 'QR_ONLY' | 'MOBILE_ONLY' | 'BOTH',
    workStartTime: '10:00',
    workEndTime: '18:00',
    lateThresholdMinutes: 10,
    earlyClockInGraceMinutes: 15,
    lateClockOutGraceMinutes: 30,
    notificationRetentionDays: 30,
  });

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isLoading, isAdmin, router]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/org-settings');
    if (res.data) {
      const data = res.data as any;
      setSettings(data);
      setFormData({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        language: data.language,
        calendarMode: data.calendarMode,
        geofenceEnabled: data.geofenceEnabled || false,
        attendanceMode: data.attendanceMode || 'QR_ONLY',
        officeLat: data.officeLat || '',
        officeLng: data.officeLng || '',
        geofenceRadius: data.geofenceRadius || 100,
        workStartTime: data.workStartTime || '10:00',
        workEndTime: data.workEndTime || '18:00',
        lateThresholdMinutes: data.lateThresholdMinutes || 10,
        earlyClockInGraceMinutes: data.earlyClockInGraceMinutes ?? 15,
        lateClockOutGraceMinutes: data.lateClockOutGraceMinutes ?? 30,
        notificationRetentionDays: 30,
      });
      const configRes = await api.get('/api/config');
      if (configRes.data) {
        const configMap = (configRes.data as any).configMap || {};
        setFormData(prev => ({
          ...prev,
          notificationRetentionDays: configMap.notificationRetentionDays
            ? parseInt(configMap.notificationRetentionDays)
            : 30,
        }));
      }
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isAdmin) loadSettings();
  }, [user, isAdmin, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const res = await api.put('/api/org-settings', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      language: formData.language,
      calendarMode: formData.calendarMode,
      geofenceEnabled: formData.geofenceEnabled,
      attendanceMode: formData.attendanceMode,
      officeLat: formData.geofenceEnabled && formData.officeLat ? parseFloat(formData.officeLat) : null,
      officeLng: formData.geofenceEnabled && formData.officeLng ? parseFloat(formData.officeLng) : null,
      geofenceRadius: formData.geofenceEnabled ? formData.geofenceRadius : 100,
      workStartTime: formData.workStartTime,
      workEndTime: formData.workEndTime,
      lateThresholdMinutes: formData.lateThresholdMinutes,
      earlyClockInGraceMinutes: formData.earlyClockInGraceMinutes,
      lateClockOutGraceMinutes: formData.lateClockOutGraceMinutes,
    });

    await api.put('/api/config/notificationRetentionDays', {
      value: String(Math.min(90, Math.max(7, formData.notificationRetentionDays))),
    });

    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNepali ? 'सेटिङ्स सफलतापूर्वक अपडेट गरियो।' : 'Settings updated successfully.');
      const updated = res.data as any;
      setSettings(updated);
      setFormData({
        name: updated.name,
        email: updated.email || '',
        phone: updated.phone || '',
        address: updated.address || '',
        language: updated.language,
        calendarMode: updated.calendarMode,
        geofenceEnabled: updated.geofenceEnabled || false,
        attendanceMode: updated.attendanceMode || 'QR_ONLY',
        officeLat: updated.officeLat || '',
        officeLng: updated.officeLng || '',
        geofenceRadius: updated.geofenceRadius || 100,
        workStartTime: updated.workStartTime || '10:00',
        workEndTime: updated.workEndTime || '18:00',
        lateThresholdMinutes: updated.lateThresholdMinutes || 10,
        earlyClockInGraceMinutes: updated.earlyClockInGraceMinutes ?? 15,
        lateClockOutGraceMinutes: updated.lateClockOutGraceMinutes ?? 30,
        notificationRetentionDays: formData.notificationRetentionDays,
      });
      await refreshUser();
      setLastRefreshed(new Date());
      setTimeout(() => setSuccess(''), 5000);
    }

    setSaving(false);
  };

  const getCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData({
            ...formData,
            officeLat: pos.coords.latitude.toString(),
            officeLng: pos.coords.longitude.toString(),
          });
        },
        () => {
          setError(isNepali ? 'स्थान प्राप्त गर्न सकिएन' : 'Could not get location');
        }
      );
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setFormData({ ...formData, officeLat: lat.toString(), officeLng: lng.toString() });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-900">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-900">
                    {isNepali ? 'संगठन सेटिङ्स' : 'Organization settings'}
                  </h1>
                  <p className="text-sm text-slate-500">{settings?.name}</p>
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
              <button onClick={loadSettings} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {isNepali ? 'रिफ्रेश' : 'Refresh'}
              </button>
              <button onClick={logout} className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span className="text-sm font-medium text-rose-700">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">{success}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Language & Calendar */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-800"><Languages className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                    {isNepali ? 'भाषा र क्यालेन्डर' : 'Language & Calendar'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isNepali ? 'तपाईंको संगठनको प्राथमिकता सेट गर्नुहोस्' : 'Set your organization preferences'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Globe className="w-4 h-4 text-slate-400" />
                  {isNepali ? 'प्रदर्शन भाषा' : 'Display language'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['NEPALI', 'ENGLISH'] as const).map((lang) => (
                    <button key={lang} onClick={() => setFormData({ ...formData, language: lang })}
                      className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${formData.language === lang ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-800 mb-2">{lang === 'NEPALI' ? 'नेपाली' : 'English'}</div>
                        <div className="text-xs text-slate-500">{lang === 'NEPALI' ? 'Nepali' : 'अंग्रेजी'}</div>
                      </div>
                      {formData.language === lang && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {isNepali ? 'क्यालेन्डर मोड' : 'Calendar mode'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['NEPALI', 'ENGLISH'] as const).map((mode) => (
                    <button key={mode} onClick={() => setFormData({ ...formData, calendarMode: mode })}
                      className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${formData.calendarMode === mode ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800 mb-2">{mode === 'NEPALI' ? 'बि.सं.' : 'A.D.'}</div>
                        <div className="text-xs text-slate-500">{mode === 'NEPALI' ? 'Bikram Sambat' : 'Gregorian'}</div>
                      </div>
                      {formData.calendarMode === mode && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-800"><Building className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                    {isNepali ? 'संगठन विवरण' : 'Organization details'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isNepali ? 'तपाईंको संगठनको आधारभूत जानकारी' : 'Basic information about your organization'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building className="w-4 h-4 text-slate-400" />
                  {isNepali ? 'संगठनको नाम' : 'Organization name'}
                </label>
                <input type="text" value={formData.name} readOnly
                  className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-300"
                  placeholder={isNepali ? 'तपाईंको संगठनको नाम' : 'Your organization name'} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />{isNepali ? 'इमेल' : 'Email'}
                  </label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="info@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />{isNepali ? 'फोन' : 'Phone'}
                  </label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="+977 1 2345678" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />{isNepali ? 'ठेगाना' : 'Address'}
                </label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder={isNepali ? 'काठमाडौं, नेपाल' : 'Kathmandu, Nepal'} />
              </div>
            </div>
          </div>

          {/* ===== WORK SCHEDULE SECTION ===== */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-800"><Clock className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                    {isNepali ? 'कार्य समयतालिका' : 'Work Schedule'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isNepali
                      ? 'कार्यालयको समय, ढिलो सीमा र ग्रेस पिरियड सेट गर्नुहोस्'
                      : 'Set office hours, late threshold, and grace periods'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Opening / Closing times */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {isNepali ? 'खुल्ने समय' : 'Opening Time'}
                  </label>
                  <input type="time" value={formData.workStartTime}
                    onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'कर्मचारीहरू यो समय पछि आए ढिलो मानिन्छ'
                      : 'Employees arriving after this time are marked late'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {isNepali ? 'बन्द हुने समय' : 'Closing Time'}
                  </label>
                  <input type="time" value={formData.workEndTime}
                    onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'कार्यालय बन्द हुने समय — AUTO_CLOSED रेकर्डहरू यहाँ सीमित हुन्छन्'
                      : 'Office closing time — forgotten clock-outs are capped here'}
                  </p>
                </div>
              </div>

              {/* Late threshold + Notification retention */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {isNepali ? 'ढिलो आगमन सीमा (मिनेट)' : 'Late Threshold (Minutes)'}
                  </label>
                  <input type="number" min="0" max="60" step="5"
                    value={formData.lateThresholdMinutes}
                    onChange={(e) => setFormData({ ...formData, lateThresholdMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="10" />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'यो मिनेट भन्दा बढी ढिलो भएमा सूचना पठाउनुहोस्। (डिफल्ट: १०)'
                      : 'Notify when employee is late by more than this. (Default: 10)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {isNepali ? 'सूचना राख्ने दिन' : 'Notification Retention (days)'}
                  </label>
                  <input type="number" min="7" max="90"
                    value={formData.notificationRetentionDays ?? 30}
                    onChange={(e) => setFormData({ ...formData, notificationRetentionDays: Math.min(90, Math.max(7, parseInt(e.target.value) || 30)) })}
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                  <p className="text-xs text-slate-500">
                    {isNepali
                      ? 'सूचनाहरू यो दिन पछि स्वतः हटाइनेछ। (न्यूनतम: ७, अधिकतम: ९०)'
                      : 'Notifications older than this will be auto-deleted. Min: 7, Max: 90 days.'}
                  </p>
                </div>
              </div>

              {/* ===== Grace period fields (Point 1) ===== */}
              <div className="pt-2 pb-1">
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {isNepali ? 'ओभरटाइम ग्रेस पिरियड' : 'Overtime Grace Periods'}
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  {isNepali
                    ? 'यी मिनेटहरूलाई ओभरटाइम गणनामा समावेश गरिँदैन। सानो अन्तरलाई ओभरटाइम मान्नबाट रोक्छ।'
                    : 'Minutes within these windows are not counted as overtime — prevents minor time differences from inflating overtime pay.'}
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {isNepali ? 'सुरु ग्रेस (मिनेट)' : 'Early Clock-in Grace (min)'}
                    </label>
                    <input type="number" min="0" max="60" step="5"
                      value={formData.earlyClockInGraceMinutes}
                      onChange={(e) => setFormData({ ...formData, earlyClockInGraceMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="15" />
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'शुरु समय भन्दा यति मिनेट अगाडि आएमा ओभरटाइम मानिँदैन। (डिफल्ट: १५)'
                        : 'Clock-ins this many minutes before shift start are treated as on-time. (Default: 15)'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {isNepali ? 'अन्त ग्रेस (मिनेट)' : 'Late Clock-out Grace (min)'}
                    </label>
                    <input type="number" min="0" max="120" step="5"
                      value={formData.lateClockOutGraceMinutes}
                      onChange={(e) => setFormData({ ...formData, lateClockOutGraceMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="30" />
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'अन्त समय पछि यति मिनेटसम्म ओभरटाइम मानिँदैन। (डिफल्ट: ३०)'
                        : 'Clock-outs this many minutes after shift end are treated as on-time. (Default: 30)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Geofencing */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-800"><Compass className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                    {isNepali ? 'जियोफेन्सिङ' : 'Geofencing'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isNepali ? 'कर्मचारीहरू कार्यालय नजिक मात्र चेक इन गर्न सक्छन्' : 'Employees can only check in when near the office'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label className="flex items-center gap-3 cursor-pointer group mb-6">
                <div className="relative">
                  <input type="checkbox" checked={formData.geofenceEnabled}
                    onChange={(e) => setFormData({ ...formData, geofenceEnabled: e.target.checked })}
                    className="sr-only" />
                  <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${formData.geofenceEnabled ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 absolute top-1 ${formData.geofenceEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  {isNepali ? 'जियोफेन्सिङ सक्रिय गर्नुहोस्' : 'Enable geofencing'}
                </span>
              </label>

              {/* Attendance Mode */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isNepali ? 'उपस्थिति विधि' : 'Attendance Method'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['QR_ONLY', 'MOBILE_ONLY', 'BOTH'] as const).map((mode) => {
                    const labels = { QR_ONLY: isNepali ? 'QR मात्र' : 'QR Only', MOBILE_ONLY: isNepali ? 'मोबाइल मात्र' : 'Mobile Only', BOTH: isNepali ? 'दुवै' : 'Both' };
                    const descs = { QR_ONLY: isNepali ? 'QR स्क्यान गरेर' : 'Scan QR code', MOBILE_ONLY: isNepali ? 'GPS बाट' : 'GPS check-in', BOTH: isNepali ? 'QR वा GPS' : 'QR or GPS' };
                    return (
                      <button key={mode} type="button"
                        onClick={() => setFormData({ ...formData, attendanceMode: mode })}
                        className={'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ' + (formData.attendanceMode === mode ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300')}>
                        <span className={'text-sm font-semibold ' + (formData.attendanceMode === mode ? 'text-slate-900' : 'text-slate-600')}>{labels[mode]}</span>
                        <span className="text-[11px] text-slate-400">{descs[mode]}</span>
                      </button>
                    );
                  })}
                </div>
                {(formData.attendanceMode === 'MOBILE_ONLY' || formData.attendanceMode === 'BOTH') && !formData.geofenceEnabled && (
                  <p className="mt-2 text-xs text-amber-600 font-medium">⚠ {isNepali ? 'मोबाइल चेक-इनको लागि जियोफेन्सिङ सक्रिय हुनुपर्छ' : 'Geofencing must be enabled for mobile check-in'}</p>
                )}
              </div>

              {formData.geofenceEnabled && (
                <div className="space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      {isNepali
                        ? 'नक्सामा क्लिक गर्नुहोस् वा मार्कर तान्नुहोस् स्थान सेट गर्न।'
                        : 'Click on the map or drag the marker to set location. Dashed circle shows geofence area.'}
                    </p>
                    <GeofenceMap
                      latitude={formData.officeLat ? Number(formData.officeLat) : 27.7172}
                      longitude={formData.officeLng ? Number(formData.officeLng) : 85.3240}
                      radius={formData.geofenceRadius}
                      onLocationChange={handleMapLocationChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">{isNepali ? 'अक्षांश' : 'Latitude'}</label>
                      <div className="relative">
                        <input type="number" step="any" value={formData.officeLat}
                          onChange={(e) => setFormData({ ...formData, officeLat: e.target.value })}
                          placeholder="27.7172"
                          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 pl-8" />
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">{isNepali ? 'देशान्तर' : 'Longitude'}</label>
                      <div className="relative">
                        <input type="number" step="any" value={formData.officeLng}
                          onChange={(e) => setFormData({ ...formData, officeLng: e.target.value })}
                          placeholder="85.3240"
                          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 pl-8" />
                        <Compass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">{isNepali ? 'अनुमति दायरा' : 'Allowed radius'}</label>
                      <span className="text-sm font-medium text-slate-700">{formData.geofenceRadius}m</span>
                    </div>
                    <input type="range" min="50" max="500" step="10" value={formData.geofenceRadius}
                      onChange={(e) => setFormData({ ...formData, geofenceRadius: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                    <div className="flex justify-between text-[10px] text-slate-400 px-1">
                      <span>50m</span><span>275m</span><span>500m</span>
                    </div>
                  </div>
                  <button type="button" onClick={getCurrentLocation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    <LocateFixed className="w-4 h-4" />
                    {isNepali ? 'हालको स्थान प्रयोग गर्नुहोस्' : 'Use current location'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Type Manager */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden p-5">
            <DocumentTypeManager language={formData.language} />
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => router.push('/admin')}
              className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              {isNepali ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-900 hover:to-slate-800 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow">
              {saving ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>{isNepali ? 'सेभ हुँदैछ...' : 'Saving...'}</span></>
              ) : (
                <><Save className="w-4 h-4 group-hover:scale-110 transition-transform" /><span>{isNepali ? 'सेभ गर्नुहोस्' : 'Save changes'}</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 pt-8 pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100"><Shield className="w-4 h-4 text-slate-600" /></div>
            <div>
              <p className="text-xs font-medium text-slate-900">{isNepali ? 'संगठन सेटिङ्स' : 'Organization settings'}</p>
              <p className="text-[10px] text-slate-500">{isNepali ? 'स्मार्ट उपस्थिति प्रणाली' : 'Smart Attendance System'}</p>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </AdminLayout>
  );
}