import RoleGuard from '@/components/RoleGuard';

export default function HolidaysRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ADMIN']}>
      {children}
    </RoleGuard>
  );
}