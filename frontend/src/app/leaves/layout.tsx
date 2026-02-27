import RoleGuard from '@/components/RoleGuard';

export default function LeavesRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ADMIN', 'EMPLOYEE']}>
      {children}
    </RoleGuard>
  );
}