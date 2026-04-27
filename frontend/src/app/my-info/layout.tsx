import RoleGuard from '@/components/RoleGuard'

export default function MyInfoRouteLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['EMPLOYEE']}>{children}</RoleGuard>
}
