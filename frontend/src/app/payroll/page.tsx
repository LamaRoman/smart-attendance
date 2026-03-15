'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import AccountantLayout from '@/components/AccountantLayout';
import {
  CreditCard, Clock, CheckCircle, AlertCircle, X,
  Settings, FileText, Play, RefreshCw, AlertTriangle, BarChart3,
} from 'lucide-react';
import { adToBS } from '@/components/BSDatePicker';

import { PaySettings, PayrollRecord, Tab } from './types';
import { defaultSettings, calculateTDS, paySettingsFromApi } from './utils';
import SettingsTab from './components/SettingsTab';
import GenerateTab from './components/GenerateTab';
import RecordsTab from './components/RecordsTab';
import AnnualTab from './components/AnnualTab';
import MultiMonthTab from './components/MultiMonthTab';
import PayslipModal from './components/PayslipModal';

export default function PayrollPage() {
  const { user, isLoading, language, features } = useAuth();
  const router = useRouter();
  const isNp = language === 'NEPALI';

  // ── Derived from auth context — works for all roles ──
  const featurePayrollWorkflow = features.payrollWorkflow;
  const isStarter = user?.planFeatures?.tier === 'STARTER';
  const isAccountant = user?.role === 'ORG_ACCOUNTANT';

  // ── UI state ──
  const [tab, setTab] = useState<Tab>('settings');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ── Settings tab ──
  const [users, setUsers] = useState<any[]>([]);
  const [allPaySettings, setAllPaySettings] = useState<Record<string, any>>({});
  const [selectedUser, setSelectedUser] = useState('');
  const [form, setForm] = useState<PaySettings>({ ...defaultSettings });
  const [originalForm, setOriginalForm] = useState<PaySettings>({ ...defaultSettings });
  const [saving, setSaving] = useState(false);
  const [tdsSlabs, setTdsSlabs] = useState<any>(null);
  const [showTdsInfo, setShowTdsInfo] = useState(false);
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);

  // ── Generate tab ──
  const todayBS = adToBS(new Date());
  const [genYear, setGenYear] = useState(todayBS.year);
  const [genMonth, setGenMonth] = useState(todayBS.month);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);

  // ── Records tab ──
  const [recYear, setRecYear] = useState(todayBS.year);
  const [recMonth, setRecMonth] = useState(todayBS.month);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // ── Annual tab ──
  const [annualYear, setAnnualYear] = useState(todayBS.year);
  const [annualData, setAnnualData] = useState<any>(null);
  const [loadingAnnual, setLoadingAnnual] = useState(false);

  // ── Multi-month tab ──
  const [multiFromYear, setMultiFromYear] = useState(todayBS.year);
  const [multiFromMonth, setMultiFromMonth] = useState(1);
  const [multiToYear, setMultiToYear] = useState(todayBS.year);
  const [multiToMonth, setMultiToMonth] = useState(3);
  const [multiMonthData, setMultiMonthData] = useState<any>(null);
  const [loadingMultiMonth, setLoadingMultiMonth] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(originalForm),
    [form, originalForm],
  );

  const liveCalculation = useMemo(() => {
    const gross =
      form.basicSalary + form.dearnessAllowance + form.transportAllowance +
      form.medicalAllowance + form.otherAllowances;
    const employeeSsf = form.ssfEnabled ? (gross * form.employeeSsfRate) / 100 : 0;
    const employeePf = form.pfEnabled ? (gross * form.employeePfRate) / 100 : 0;
    const citDeduction = form.citEnabled ? form.citAmount : 0;
    const tds = form.tdsEnabled
      ? calculateTDS(gross * 12, form.isMarried, employeeSsf, employeePf, citDeduction, form.ssfEnabled)
      : 0;
    const totalDeductions = employeeSsf + employeePf + citDeduction + tds + form.advanceDeduction;
    return {
      gross,
      employeeSsf,
      employeePf,
      citDeduction,
      tds,
      totalDeductions,
      net: gross - totalDeductions,
      employerSsf: form.ssfEnabled ? (gross * form.employerSsfRate) / 100 : 0,
      employerPf: form.pfEnabled ? (gross * form.employerPfRate) / 100 : 0,
    };
  }, [form]);

  // ── Auth guard ──
  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'ORG_ACCOUNTANT'))) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // ── Load data on tab change ──
  useEffect(() => {
    if (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'ORG_ACCOUNTANT')) return;
    if (tab === 'settings') {
      loadSettings();
      if (!tdsSlabs) {
        api.get('/api/payroll/tds-slabs').then((res) => {
          if (res.data) setTdsSlabs(res.data);
        });
      }
    }
    if (tab === 'records') loadRecords();
  }, [user, tab, recYear, recMonth]);

  // ── Warn before unload ──
  useEffect(() => {
    const handle = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [hasUnsavedChanges]);

  // ── Ctrl+S shortcut ──
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedUser && hasUnsavedChanges) saveSettings();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedUser, hasUnsavedChanges, form]);

  // ── API helpers ──

  const loadSettings = useCallback(async () => {
    const res = await api.get('/api/payroll/settings');
    if (res.data) {
      const d = res.data as any;
      const employees: any[] = Array.isArray(d) ? d : (d.employees || []);
      setUsers(employees);
      const map: Record<string, any> = {};
      employees.forEach((emp) => { if (emp.paySettings) map[emp.id] = emp.paySettings; });
      setAllPaySettings(map);
      setLastRefreshed(new Date());
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    const res = await api.get(`/api/payroll/records?bsYear=${recYear}&bsMonth=${recMonth}`);
    if (res.data) {
      setRecords((res.data as any).records || []);
      setLastRefreshed(new Date());
    }
    setLoadingRecords(false);
  }, [recYear, recMonth]);

  const loadAnnualData = async () => {
    setLoadingAnnual(true);
    const res = await api.get(`/api/payroll/annual-report?bsYear=${annualYear}`);
    if (res.data) setAnnualData(res.data);
    setLoadingAnnual(false);
    setLastRefreshed(new Date());
  };

  const loadMultiMonthData = async () => {
    setLoadingMultiMonth(true);
    const res = await api.get(
      `/api/payroll/multi-month?fromBsYear=${multiFromYear}&fromBsMonth=${multiFromMonth}&toBsYear=${multiToYear}&toBsMonth=${multiToMonth}`,
    );
    if (res.error) setError(res.error.message);
    else setMultiMonthData(res.data);
    setLoadingMultiMonth(false);
  };

  const saveSettings = async () => {
    if (!selectedUser) { setError(isNp ? 'कर्मचारी छान्नुहोस्' : 'Select an employee'); return; }
    const pct = originalForm.basicSalary > 0 && form.basicSalary > 0
      ? Math.abs((form.basicSalary - originalForm.basicSalary) / originalForm.basicSalary * 100)
      : 0;
    if (pct > 50) {
      const msg = isNp
        ? `आधारभूत तलबमा ${pct.toFixed(0)}% परिवर्तन। जारी राख्नुहुन्छ?`
        : `Basic salary changed by ${pct.toFixed(0)}%. Continue?`;
      if (!confirm(msg)) return;
    }
    setSaving(true); setError('');
    const res = await api.put(`/api/payroll/settings/${selectedUser}`, form);
    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(isNp ? 'तलब सेटिङ सुरक्षित गरियो' : 'Pay settings saved');
      setOriginalForm({ ...form });
      loadSettings();
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  const generatePayroll = async (overtimeOverrides: Record<string, number> = {}, reason?: string) => {
    setGenerating(true); setError('');
    const res = await api.post('/api/payroll/generate', {
      bsYear: genYear,
      bsMonth: genMonth,
      overtimeOverrides: Object.keys(overtimeOverrides).length > 0 ? overtimeOverrides : undefined,
      ...(reason ? { reason } : {}),
    });
    if (res.error) {
      setError(res.error.message);
   } else {
        setGenResult(res.data);
        setSuccess(isNp ? 'तलब गणना सफल' : 'Payroll generated successfully');
        setTimeout(() => setSuccess(''), 3000);
        setLastRefreshed(new Date());
        // Sync records tab to generated month so switching tabs shows correct data
        setRecYear(genYear);
        setRecMonth(genMonth);
      }
      setGenerating(false);
  };

  const bulkUpdateStatus = async (status: string) => {
    const res = await api.put('/api/payroll/records/bulk-status', { bsYear: recYear, bsMonth: recMonth, status });
    if (res.error) { setError(res.error.message); return; }
    loadRecords();
    setSuccess(isNp ? 'स्थिति अपडेट गरियो' : 'Status updated');
    setTimeout(() => setSuccess(''), 3000);
  };

  const selectUser = (userId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm(isNp ? 'असुरक्षित परिवर्तनहरू छन्। जारी राख्नुहुन्छ?' : 'You have unsaved changes. Continue?'))
        return;
    }
    setSelectedUser(userId);
    const existing = allPaySettings[userId];
    const newForm = existing ? paySettingsFromApi(existing) : { ...defaultSettings };
    setForm(newForm);
    setOriginalForm(newForm);
  };

  const copyFromEmployee = (sourceId: string) => {
    const src = allPaySettings[sourceId];
    if (!src) return;
    setForm(paySettingsFromApi(src));
    setShowCopyDropdown(false);
    setSuccess(isNp ? 'सेटिङहरू प्रतिलिपि गरियो' : 'Settings copied');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleTabChange = (newTab: Tab) => {
    if (hasUnsavedChanges && tab === 'settings') {
      if (!confirm(isNp ? 'असुरक्षित परिवर्तनहरू छन्। जारी राख्नुहुन्छ?' : 'You have unsaved changes. Continue?'))
        return;
    }
    setTab(newTab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const tabDefs: { key: Tab; label: string; icon: React.ElementType; locked?: boolean }[] = [
    { key: 'settings',    label: isNp ? 'तलब सेटिङ'    : 'Pay settings',     icon: Settings   },
    { key: 'generate',    label: isNp ? 'तलब गणना'     : 'Generate payroll', icon: Play       },
    { key: 'records',     label: isNp ? 'तलब रेकर्ड'   : 'Payroll records',  icon: FileText   },
    { key: 'annual',      label: isNp ? 'वार्षिक विवरण' : 'Annual report',    icon: CreditCard, locked: isStarter },
    { key: 'multimonth',  label: isNp ? 'बहु-महिना दृश्य' : 'Multi-Month',   icon: BarChart3,  locked: isStarter },
  ];
  const isBusy = saving || generating || loadingRecords;
  const Layout = isAccountant ? AccountantLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isNp ? 'पेरोल व्यवस्थापन' : 'Payroll management'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isNp ? 'कर्मचारी तलब र कटौती व्यवस्थापन' : 'Manage employee salaries and deductions'}
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
              onClick={() => { if (tab === 'settings') loadSettings(); if (tab === 'records') loadRecords(); }}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              {isNp ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasUnsavedChanges && tab === 'settings' && (
          <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">
                {isNp ? 'असुरक्षित परिवर्तनहरू छन्' : 'You have unsaved changes'}
              </span>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {isNp ? 'सुरक्षित गर्नुहोस्' : 'Save now'}
            </button>
          </div>
        )}

        {/* Error / success toasts */}
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

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 pb-1">
          {tabDefs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${
                t.locked
                  ? 'text-slate-300'
                  : tab === t.key
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.locked && (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                  PRO
                </span>
              )}
              {t.key === 'settings' && hasUnsavedChanges && (
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
              )}
              {tab === t.key && !t.locked && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'settings' && (
          <SettingsTab
            isNp={isNp}
            readOnly={isAccountant}
            users={users}
            allPaySettings={allPaySettings}
            selectedUser={selectedUser}
            form={form}
            originalForm={originalForm}
            hasUnsavedChanges={hasUnsavedChanges}
            liveCalculation={liveCalculation}
            tdsSlabs={tdsSlabs}
            showTdsInfo={showTdsInfo}
            showCopyDropdown={showCopyDropdown}
            saving={saving}
            onSelectUser={selectUser}
            onFormChange={setForm}
            onSave={saveSettings}
            onCancel={() => setForm({ ...originalForm })}
            onCopyFrom={copyFromEmployee}
            onSetShowTdsInfo={setShowTdsInfo}
            onSetShowCopyDropdown={setShowCopyDropdown}
          />
        )}

        {tab === 'generate' && (
          <GenerateTab
            isNp={isNp}
            userRole={user?.role}
            genYear={genYear}
            genMonth={genMonth}
            generating={generating}
            genResult={genResult}
            onSetYear={setGenYear}
            onSetMonth={setGenMonth}
            onGenerate={generatePayroll}
          />
        )}

        {tab === 'records' && (
          <RecordsTab
            language={language as any}
            isStarter={isStarter}
            userRole={user?.role}
            featurePayrollWorkflow={featurePayrollWorkflow}
            recYear={recYear}
            recMonth={recMonth}
            records={records}
            loadingRecords={loadingRecords}
            onSetYear={(y) => { setRecYear(y); }}
            onSetMonth={(m) => { setRecMonth(m); }}
            onLoad={loadRecords}
            onBulkStatus={bulkUpdateStatus}
            onViewPayslip={setSelectedPayslip}
          />
        )}

        {tab === 'annual' && (
          <AnnualTab
            language={language as any}
            isStarter={isStarter}
            annualYear={annualYear}
            annualData={annualData}
            loadingAnnual={loadingAnnual}
            onSetYear={setAnnualYear}
            onLoad={loadAnnualData}
            onUpgrade={() => router.push('/admin/billing')}
          />
        )}

        {tab === 'multimonth' && (
          <MultiMonthTab
            language={language as any}
            isStarter={isStarter}
            multiFromYear={multiFromYear}
            multiFromMonth={multiFromMonth}
            multiToYear={multiToYear}
            multiToMonth={multiToMonth}
            multiMonthData={multiMonthData}
            loadingMultiMonth={loadingMultiMonth}
            expandedEmployee={expandedEmployee}
            onSetFromYear={setMultiFromYear}
            onSetFromMonth={setMultiFromMonth}
            onSetToYear={setMultiToYear}
            onSetToMonth={setMultiToMonth}
            onLoad={loadMultiMonthData}
            onToggleExpand={(id) => setExpandedEmployee((prev) => (prev === id ? null : id))}
            onUpgrade={() => router.push('/admin/billing')}
          />
        )}
      </div>

      {/* Payslip modal */}
      {selectedPayslip && (
        <PayslipModal
          record={selectedPayslip}
          language={language as any}
          isStarter={isStarter}
          onClose={() => setSelectedPayslip(null)}
          onError={setError}
        />
      )}
    </Layout>
  );
}