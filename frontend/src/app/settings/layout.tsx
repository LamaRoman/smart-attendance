import RoleGuard from '@/components/RoleGuard';

export default function SettingsRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ADMIN']}>
      {children}
    </RoleGuard>
  );
}