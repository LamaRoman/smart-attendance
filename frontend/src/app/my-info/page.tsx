'use client';

import { useState, useEffect } from 'react';
import DocumentManager from "@/components/DocumentManager";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Building,
  BadgeCheck,
  Calendar,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Pencil,
  KeyRound,
} from 'lucide-react';
import PoweredBy from '@/components/PoweredBy';
import { adToBS, toNepaliDigits, BS_MONTHS_NP } from '@/components/BSDatePicker';
export default function MyInfoPage() {
  const { user, isLoading, language, calendarMode, refreshUser } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [originalForm, setOriginalForm] = useState({ ...form });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resettingPin, setResettingPin] = useState(false);

  useEffect(() => {
    if (user) {
      const initial = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: (user as any).phone || '',
        email: user.email || '',
      };
      setForm(initial);
      setOriginalForm(initial);
    }
  }, [user]);

  const hasProfileChanges =
    form.firstName !== originalForm.firstName ||
    form.lastName !== originalForm.lastName ||
    form.phone !== originalForm.phone ||
    form.email !== originalForm.email;

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    try {
      const emailChanged = form.email !== originalForm.email;

      // Client-side check: if email is being changed, we need the current password
      if (emailChanged && !emailChangePassword) {
        setProfileMsg({
          type: 'error',
          text: isNp
            ? 'इमेल परिवर्तन गर्न हालको पासवर्ड आवश्यक छ'
            : 'Current password is required to change your email',
        });
        setSaving(false);
        return;
      }

      const payload: any = {};
      if (form.firstName !== originalForm.firstName) payload.firstName = form.firstName;
      if (form.lastName !== originalForm.lastName) payload.lastName = form.lastName;
      if (form.phone !== originalForm.phone) payload.phone = form.phone;
      if (emailChanged) {
        payload.email = form.email;
        payload.currentPassword = emailChangePassword;
      }

      const res = await api.put('/api/v1/users/' + user!.id, payload);
      if (res.error) throw new Error(res.error.message);

      setOriginalForm({ ...form });
      setEmailChangePassword(''); // clear after success
      if (typeof refreshUser === 'function') await refreshUser();
      setProfileMsg({
        type: 'success',
        text: emailChanged
          ? (isNp
            ? 'इमेल परिवर्तन भयो। पुष्टिकरण तपाईंको पुरानो इमेलमा पठाइयो।'
            : 'Email changed. A confirmation has been sent to your previous email address.')
          : (isNp ? 'विवरण सफलतापूर्वक अपडेट भयो!' : 'Profile updated successfully!'),
      });
    } catch (e: any) {
      setProfileMsg({ type: 'error', text: e.message || 'Failed to update profile' });
    }
    setSaving(false);
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (!pwForm.currentPassword) { setPwMsg({ type: 'error', text: isNp ? 'हालको पासवर्ड आवश्यक छ' : 'Current password is required' }); return; }
    if (!pwForm.newPassword) { setPwMsg({ type: 'error', text: isNp ? 'नयाँ पासवर्ड आवश्यक छ' : 'New password is required' }); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg({ type: 'error', text: isNp ? 'पासवर्ड मेल खाएन' : 'Passwords do not match' }); return; }
    const pw = pwForm.newPassword;
    if (pw.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' }); return; }
    if (!/[A-Z]/.test(pw)) { setPwMsg({ type: 'error', text: 'Must contain at least one uppercase letter' }); return; }
    if (!/[a-z]/.test(pw)) { setPwMsg({ type: 'error', text: 'Must contain at least one lowercase letter' }); return; }
    if (!/[0-9]/.test(pw)) { setPwMsg({ type: 'error', text: 'Must contain at least one number' }); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) { setPwMsg({ type: 'error', text: 'Must contain at least one special character' }); return; }

    setPwSaving(true);
    try {
      const res = await api.post('/api/v1/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pw });
      if (res.error) throw new Error(res.error.message);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg({ type: 'success', text: isNp ? 'पासवर्ड सफलतापूर्वक परिवर्तन भयो!' : 'Password changed successfully!' });
    } catch (e: any) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to change password' });
    }
    setPwSaving(false);
  };

  const savePin = async () => {
    setPinMsg(null);
    if (!pinForm.currentPin || pinForm.currentPin.length !== 4) {
      setPinMsg({ type: 'error', text: isNp ? 'हालको PIN ४ अंकको हुनुपर्छ' : 'Current PIN must be 4 digits' }); return;
    }
    if (!pinForm.newPin || pinForm.newPin.length !== 4) {
      setPinMsg({ type: 'error', text: isNp ? 'नयाँ PIN ४ अंकको हुनुपर्छ' : 'New PIN must be 4 digits' }); return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinMsg({ type: 'error', text: isNp ? 'PIN मेल खाएन' : 'PINs do not match' }); return;
    }
    if (pinForm.currentPin === pinForm.newPin) {
      setPinMsg({ type: 'error', text: isNp ? 'नयाँ PIN हालकोभन्दा फरक हुनुपर्छ' : 'New PIN must be different from current PIN' }); return;
    }
    setPinSaving(true);
    try {
      const res = await api.patch('/api/v1/auth/attendance-pin', { currentPin: pinForm.currentPin, newPin: pinForm.newPin });
      if (res.error) throw new Error(res.error.message);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setPinMsg({ type: 'success', text: isNp ? 'PIN सफलतापूर्वक परिवर्तन भयो!' : 'Attendance PIN changed successfully!' });
    } catch (e: any) {
      setPinMsg({ type: 'error', text: e.message || 'Failed to change PIN' });
    }
    setPinSaving(false);
  };

  const handleForgotPin = async () => {
    if (!confirm(isNp ? 'नयाँ PIN तपाईंको इमेलमा पठाइनेछ। जारी राख्ने?' : 'A new PIN will be generated and sent to your email. Continue?')) return;
    setResettingPin(true);
    setPinMsg(null);
    try {
      const res = await api.post('/api/v1/auth/forgot-attendance-pin', {});
      if (res.error) throw new Error(res.error.message);
      setPinMsg({ type: 'success', text: isNp ? 'नयाँ PIN तपाईंको इमेलमा पठाइयो।' : 'A new PIN has been sent to your email.' });
    } catch (e: any) {
      setPinMsg({ type: 'error', text: e.message || 'Failed to reset PIN' });
    }
    setResettingPin(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
  const roleLabel: Record<string, string> = {
    EMPLOYEE: isNp ? 'कर्मचारी' : 'Employee',
    ORG_ACCOUNTANT: isNp ? 'लेखापाल' : 'Accountant',
    ORG_ADMIN: isNp ? 'प्रशासक' : 'Admin',
  };
  const inputClass = 'w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors bg-white';
  const pinInputClass = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors bg-white text-center tracking-widest font-medium';

  const Feedback = ({ msg }: { msg: { type: 'success' | 'error'; text: string } }) => (
    <div className={'flex items-center gap-2 p-3 rounded-lg text-sm ' + (
      msg.type === 'success'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : 'bg-red-50 border border-red-200 text-red-700'
    )}>
      {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg.text}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-5">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => router.push('/employee')}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {isNp ? 'मेरो विवरण' : 'My info'}
              </h1>
              <p className="text-sm text-slate-500">
                {isNp ? 'व्यक्तिगत जानकारी र सेटिङ' : 'Personal information & settings'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-5 py-6 space-y-5">

        {/* Identity card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              <span className="text-base font-semibold text-white">{initials}</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider w-1/2">
                  {isNp ? 'विवरण' : 'Field'}
                </th>
                <th className="text-left py-3 px-5 text-xs font-medium text-slate-400 uppercase tracking-wider w-1/2">
                  {isNp ? 'मूल्य' : 'Value'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                    {isNp ? 'कर्मचारी ID' : 'Employee ID'}
                  </div>
                </td>
                <td className="py-3 px-5 text-sm font-medium text-slate-900">{user.employeeId || '—'}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                    {isNp ? 'प्लेटफर्म ID' : 'Platform ID'}
                  </div>
                </td>
                <td className="py-3 px-5 text-sm font-medium text-slate-900">{(user as any).platformId || '—'}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {isNp ? 'भूमिका' : 'Role'}
                  </div>
                </td>
                <td className="py-3 px-5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-slate-900">{roleLabel[user.role] || user.role}</span>
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {isNp ? 'संस्था' : 'Organization'}
                  </div>
                </td>
                <td className="py-3 px-5 text-sm font-medium text-slate-900">{user.organization?.name || '—'}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {isNp ? 'सामेल मिति' : 'Joined'}
                  </div>
                </td>
                <td className="py-3 px-5 text-sm font-medium text-slate-900">
                  {(user as any).createdAt
                    ? calendarMode === 'NEPALI'
                      ? (() => { const bs = adToBS(new Date((user as any).createdAt)); return `${toNepaliDigits(bs.day)} ${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.year)}`; })()
                      : new Date((user as any).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Edit Personal Details */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isNp ? 'व्यक्तिगत विवरण सम्पादन' : 'Edit personal details'}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'पहिलो नाम' : 'First Name'}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} placeholder={isNp ? 'पहिलो नाम' : 'First name'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'थर' : 'Last Name'}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} placeholder={isNp ? 'थर' : 'Last name'} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'इमेल' : 'Email Address'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="email@example.com" />
              </div>
            </div>
            {form.email !== originalForm.email && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {isNp ? 'हालको पासवर्ड' : 'Current Password'}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={emailChangePassword}
                    onChange={(e) => setEmailChangePassword(e.target.value)}
                    className={inputClass}
                    placeholder={isNp ? 'आफ्नो हालको पासवर्ड प्रविष्ट गर्नुहोस्' : 'Enter your current password'}
                    autoComplete="current-password"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isNp
                    ? 'सुरक्षाका लागि, इमेल परिवर्तन पुष्टि गर्न हालको पासवर्ड आवश्यक छ।'
                    : 'For your security, we require your current password to confirm the email change.'}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'फोन नम्बर' : 'Phone Number'}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder={isNp ? 'फोन नम्बर' : 'Phone number'} />
              </div>
            </div>
            {profileMsg && <Feedback msg={profileMsg} />}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={saveProfile} disabled={saving || !hasProfileChanges}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Save className="w-3.5 h-3.5" />
                {saving ? (isNp ? 'सुरक्षित गर्दै...' : 'Saving...') : (isNp ? 'सुरक्षित गर्नुहोस्' : 'Save changes')}
              </button>
              {hasProfileChanges && (
                <button onClick={() => { setForm({ ...originalForm }); setEmailChangePassword(''); setProfileMsg(null); }} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200">
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Document Manager Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <DocumentManager userId={user.id} language={language} />
        </div>

        {/* Change Attendance PIN */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isNp ? 'हाजिरी PIN परिवर्तन' : 'Change attendance PIN'}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400">
              {isNp
                ? 'हाजिरी QR स्क्यान गर्दा प्रयोग हुने ४ अंकको PIN।'
                : 'The 4-digit PIN used when scanning the attendance QR code.'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {isNp ? 'हालको PIN' : 'Current PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.currentPin}
                  onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className={pinInputClass}
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {isNp ? 'नयाँ PIN' : 'New PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className={pinInputClass}
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {isNp ? 'PIN पुष्टि' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className={pinInputClass}
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
            </div>
            {pinMsg && <Feedback msg={pinMsg} />}
            <button
              onClick={savePin}
              disabled={pinSaving || pinForm.currentPin.length !== 4 || pinForm.newPin.length !== 4 || pinForm.confirmPin.length !== 4}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {pinSaving ? (isNp ? 'परिवर्तन गर्दै...' : 'Updating...') : (isNp ? 'PIN परिवर्तन गर्नुहोस्' : 'Update PIN')}
            </button>
            <button
              onClick={handleForgotPin}
              disabled={resettingPin}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40"
            >
              {resettingPin ? (isNp ? 'पठाउँदै...' : 'Sending...') : (isNp ? 'PIN बिर्सनुभयो?' : 'Forgot PIN?')}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isNp ? 'पासवर्ड परिवर्तन' : 'Change password'}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'हालको पासवर्ड' : 'Current Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type={showCurrent ? 'text' : 'password'} value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors bg-white"
                  placeholder={isNp ? 'हालको पासवर्ड' : 'Current password'} />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'नयाँ पासवर्ड' : 'New Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type={showNew ? 'text' : 'password'} value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors bg-white"
                  placeholder={isNp ? 'नयाँ पासवर्ड' : 'New password'} />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{isNp ? 'पासवर्ड पुष्टि गर्नुहोस्' : 'Confirm New Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type={showConfirm ? 'text' : 'password'} value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors bg-white"
                  placeholder={isNp ? 'पासवर्ड दोहोर्याउनुहोस्' : 'Repeat new password'} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {isNp
                ? 'कम्तीमा ८ अक्षर, एउटा ठूलो, एउटा सानो, एउटा अंक र एउटा विशेष चिन्ह।'
                : 'Min. 8 characters with uppercase, lowercase, number and special character.'}
            </p>
            {pwMsg && <Feedback msg={pwMsg} />}
            <button onClick={savePassword} disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Lock className="w-3.5 h-3.5" />
              {pwSaving ? (isNp ? 'परिवर्तन गर्दै...' : 'Updating...') : (isNp ? 'पासवर्ड परिवर्तन गर्नुहोस्' : 'Update password')}
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <PoweredBy />
    </div>
  );
}
