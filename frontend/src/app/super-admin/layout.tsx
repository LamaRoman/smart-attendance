import RoleGuard from '@/components/RoleGuard';

export default function SuperAdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      {children}
    </RoleGuard>
  );
}