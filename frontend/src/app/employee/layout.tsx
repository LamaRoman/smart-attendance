import RoleGuard from '@/components/RoleGuard'

export default function EmployeeRouteLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['EMPLOYEE']}>{children}</RoleGuard>
}
