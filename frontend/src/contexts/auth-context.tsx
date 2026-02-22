'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  calendarMode: 'NEPALI' | 'ENGLISH';
  language: 'NEPALI' | 'ENGLISH';
  staticQREnabled: boolean;
  rotatingQREnabled: boolean;
}

interface PlanFeatures {
  isActive: boolean;
  tier: string;
  featureLeave: boolean;
  featureFullPayroll: boolean;
  featurePayrollWorkflow: boolean;
  featureReports: boolean;
  featureTotp: boolean;
  featureManualCorrection: boolean;
  featureNotifications: boolean;
  featureOnboarding: boolean;
  featureAuditLog: boolean;
  featureFileDownload: boolean;
  featureDownloadReports: boolean;
  featureDownloadPayslips: boolean;
  featureDownloadAuditLog: boolean;
  featureDownloadLeaveRecords: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  organizationId: string | null;
  organization?: Organization;
  planFeatures?: PlanFeatures | null;
}

interface Features {
  payroll: boolean;
  leave: boolean;
  reports: boolean;
  staticQR: boolean;
  rotatingQR: boolean;
  totp: boolean;
  manualCorrection: boolean;
  notifications: boolean;
  payrollWorkflow: boolean;
  fileDownload: boolean;
  downloadReports: boolean;
  downloadPayslips: boolean;
  downloadAuditLog: boolean;
  downloadLeaveRecords: boolean;
  auditLog: boolean;
  onboarding: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  calendarMode: 'NEPALI' | 'ENGLISH';
  language: 'NEPALI' | 'ENGLISH';
  features: Features;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data) {
        const data = res.data as { user: User };
        setUser(data.user);
      }
    } catch {
      // Not logged in
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });

    if (res.error) {
      throw new Error(res.error.message || 'Login failed');
    }

    const data = res.data as { user: User };
    setUser(data.user);

    // Fetch full profile (includes organization + plan features)
    const meRes = await api.get('/api/auth/me');
    if (meRes.data) {
      const meData = meRes.data as { user: User };
      setUser(meData.user);
    }

    // Route based on role
    if (data.user.role === 'SUPER_ADMIN') {
      router.push('/super-admin');
    } else if (data.user.role === 'ORG_ADMIN') {
      router.push('/admin');
    } else {
      router.push('/employee');
    }
  };

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setUser(null);
    router.push('/login');
  };

  const isAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const calendarMode = user?.organization?.calendarMode || 'NEPALI';
  const language = user?.organization?.language || 'NEPALI';

  const features: Features = {
    payroll: user?.planFeatures?.featureFullPayroll ?? false,
    leave: user?.planFeatures?.featureLeave ?? false,
    reports: user?.planFeatures?.featureReports ?? false,
    staticQR: user?.organization?.staticQREnabled ?? false,
    rotatingQR: user?.organization?.rotatingQREnabled ?? false,
    totp: user?.planFeatures?.featureTotp ?? false,
    manualCorrection: user?.planFeatures?.featureManualCorrection ?? false,
    notifications: user?.planFeatures?.featureNotifications ?? false,
    payrollWorkflow: user?.planFeatures?.featurePayrollWorkflow ?? false,
    fileDownload: user?.planFeatures?.featureFileDownload ?? false,
    downloadReports: user?.planFeatures?.featureDownloadReports ?? false,
    downloadPayslips: user?.planFeatures?.featureDownloadPayslips ?? false,
    downloadAuditLog: user?.planFeatures?.featureDownloadAuditLog ?? false,
    downloadLeaveRecords: user?.planFeatures?.featureDownloadLeaveRecords ?? false,
    auditLog: user?.planFeatures?.featureAuditLog ?? false,
    onboarding: user?.planFeatures?.featureOnboarding ?? false,
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      refreshUser: checkAuth,
      isAdmin,
      isSuperAdmin,
      calendarMode,
      language,
      features,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}