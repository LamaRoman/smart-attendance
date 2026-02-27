'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'EMPLOYEE';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

/**
 * RoleGuard — component-level route protection.
 *
 * Wrap any layout or page to restrict access by user role.
 * If not authenticated → redirect to /login
 * If authenticated but wrong role → redirect to role's home
 *
 * Role home mapping:
 *   SUPER_ADMIN → /super-admin
 *   ORG_ADMIN   → /admin
 *   EMPLOYEE    → /employee
 */

const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin',
  ORG_ADMIN: '/admin',
  EMPLOYEE: '/employee',
};

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.push(ROLE_HOME[user.role] || '/login');
    }
  }, [user, isLoading, allowedRoles, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  // Not authenticated or wrong role — render nothing while redirecting
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}