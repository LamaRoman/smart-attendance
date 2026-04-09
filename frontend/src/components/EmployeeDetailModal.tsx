'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Mail, Phone, Hash, Clock, Calendar,
  CheckCircle2, XCircle, Briefcase,
} from 'lucide-react';
import DocumentManager from './DocumentManager';
import { t, Language } from '@/lib/i18n';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: string;
  isActive: boolean;
  phone?: string | null;
  createdAt: string;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  language?: Language;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const ROLE_KEYS: Record<string, string> = {
  ORG_ADMIN:   'role.admin',
  EMPLOYEE:    'role.employee',
  SUPER_ADMIN: 'role.superAdmin',
};

const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN:   'bg-blue-50 text-blue-700',
  EMPLOYEE:    'bg-slate-100 text-slate-700',
  SUPER_ADMIN: 'bg-rose-50 text-rose-700',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function EmployeeDetailModal({
  isOpen, onClose, user, language = 'ENGLISH',
}: EmployeeDetailModalProps) {
  const lang = language;
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');
  const [fullUser, setFullUser] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setActiveTab('profile');

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/users/${user.id}`, {
          credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
          const data = await res.json();
          setFullUser(data.data || data);
        }
      } catch {
        // fallback to passed user data
      }
    };
    fetchUser();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const displayUser = fullUser || user;
  const roleKey = ROLE_KEYS[displayUser.role] || ROLE_KEYS.EMPLOYEE;
  const roleColor = ROLE_COLORS[displayUser.role] || ROLE_COLORS.EMPLOYEE;
  const initials = `${displayUser.firstName?.[0] || ''}${displayUser.lastName?.[0] || ''}`.toUpperCase();

  const tabs = [
    { key: 'profile'   as const, label: t('employee.profile', lang) },
    { key: 'documents' as const, label: t('documents.title',  lang) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{initials}</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {displayUser.firstName} {displayUser.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${roleColor}`}>
                    {t(roleKey, lang)}
                  </span>
                  {displayUser.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('common.active', lang)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                      <XCircle className="w-3 h-3" />
                      {t('common.inactive', lang)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<Hash className="w-3.5 h-3.5" />}
                label={t('employee.id', lang)}
                value={displayUser.employeeId || '--'}
              />
              <InfoItem
                icon={<Mail className="w-3.5 h-3.5" />}
                label={t('employee.email', lang)}
                value={displayUser.email}
              />
              <InfoItem
                icon={<Phone className="w-3.5 h-3.5" />}
                label={t('employee.phone', lang)}
                value={displayUser.phone || '--'}
              />
              <InfoItem
                icon={<Briefcase className="w-3.5 h-3.5" />}
                label={t('employee.role', lang)}
                value={t(roleKey, lang)}
              />
              <InfoItem
                icon={<Clock className="w-3.5 h-3.5" />}
                label={t('employee.shiftTime', lang)}
                value={
                  displayUser.shiftStartTime && displayUser.shiftEndTime
                    ? `${displayUser.shiftStartTime} - ${displayUser.shiftEndTime}`
                    : t('employee.orgDefault', lang)
                }
              />
              <InfoItem
                icon={<Calendar className="w-3.5 h-3.5" />}
                label={t('employee.joinedDate', lang)}
                value={formatDate(displayUser.createdAt)}
              />
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentManager userId={user.id} language={language} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Info Item sub-component ──
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}