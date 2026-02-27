import RoleGuard from '@/components/RoleGuard';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ADMIN']}>
      {children}
    </RoleGuard>
  );
}