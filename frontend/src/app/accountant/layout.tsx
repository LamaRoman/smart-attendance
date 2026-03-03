import RoleGuard from '@/components/RoleGuard';

export default function AccountantRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ORG_ACCOUNTANT']}>
      {children}
    </RoleGuard>
  );
}