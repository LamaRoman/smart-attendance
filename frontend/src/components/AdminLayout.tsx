'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  BarChart3,
  QrCode,
  Clock,
  FileText,
  Users,
  CalendarDays,
  CreditCard,
  Settings,
  LogOut,
  Calendar,
  Menu,
  X,
  Banknote,
  Receipt,
} from 'lucide-react'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import PoweredBy from './PoweredBy'

interface NavItem {
  path: string
  labelNp: string
  labelEn: string
  icon: React.ElementType
  featureKey?: string
  // When true, item only appears for ORG_ADMIN — not SUPER_ADMIN or EMPLOYEE
  orgAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin', labelNp: 'ड्यासबोर्ड', labelEn: 'Dashboard', icon: BarChart3 },
  {
    path: '/admin/qr',
    labelNp: 'QR कोड',
    labelEn: 'QR Code',
    icon: QrCode,
    featureKey: 'staticQR',
  },
  { path: '/admin/attendance', labelNp: 'उपस्थिति', labelEn: 'Attendance', icon: Clock },
  {
    path: '/admin/reports',
    labelNp: 'प्रतिवेदन',
    labelEn: 'Reports',
    icon: FileText,
    featureKey: 'reports',
  },
  { path: '/users', labelNp: 'प्रयोगकर्ता', labelEn: 'Users', icon: Users },
  { path: '/leaves', labelNp: 'बिदा', labelEn: 'Leaves', icon: CalendarDays, featureKey: 'leave' },
  { path: '/payroll', labelNp: 'तलब', labelEn: 'Payroll', icon: CreditCard, featureKey: 'payroll' },
  {
    path: '/holidays',
    labelNp: 'बिदाहरू',
    labelEn: 'Holidays',
    icon: Calendar,
    featureKey: 'holidaySync',
  },
  {
    path: '/admin/billing',
    labelNp: 'बिलिङ',
    labelEn: 'Billing',
    icon: Receipt,
    orgAdminOnly: true,
  },
  { path: '/settings', labelNp: 'सेटिङ्स', labelEn: 'Settings', icon: Settings },
  // Pay: only ORG_ADMIN should see this — SUPER_ADMIN manages billing differently
  { path: '/admin/pay', labelNp: 'भुक्तानी', labelEn: 'Pay', icon: Banknote, orgAdminOnly: true },
]

// Defined outside AdminLayout to avoid TypeScript JSX parsing errors
// that occur when components are defined inside another component's body.
function NavButton({
  item,
  active,
  isNp,
  mobile = false,
  onClick,
}: {
  item: NavItem
  active: boolean
  isNp: boolean
  mobile?: boolean
  onClick: () => void
}) {
  const isPayItem = item.path === '/admin/pay'
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 font-medium transition-colors ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'} ${
        active
          ? 'bg-slate-900 text-white'
          : isPayItem
            ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      } `}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {isNp ? item.labelNp : item.labelEn}
    </button>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, language, features } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isNp = language === 'NEPALI'

  const featureMap: Record<string, boolean> = {
    staticQR: true,
    reports: true,
    leave: true,
    payroll: true,
    holidaySync: true,
  }

  // user.role is typed as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'EMPLOYEE' in auth-context
  const isOrgAdmin = user?.role === 'ORG_ADMIN'

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.orgAdminOnly && !isOrgAdmin) return false
    if (!item.featureKey) return true
    return featureMap[item.featureKey] !== false
  })

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white md:flex md:w-60 lg:w-64">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Smart Attendance
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              active={isActive(item.path)}
              isNp={isNp}
              onClick={() => router.push(item.path)}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-slate-400">{isNp ? 'प्रशासक' : 'Admin'}</p>
            </div>
            {features.notifications && <NotificationBell />}
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <PoweredBy />
      </aside>

      {/* ── Mobile header ───────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 hover:bg-slate-100"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5 text-slate-600" />
            ) : (
              <Menu className="h-5 w-5 text-slate-600" />
            )}
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">Smart Attendance</span>
        </div>
        <div className="flex items-center gap-1">
          {features.notifications && <NotificationBell />}
          <button onClick={logout} className="rounded-md p-1.5 text-slate-400 hover:text-red-500">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute bottom-0 left-0 top-14 flex w-64 flex-col border-r border-slate-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {visibleNav.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  isNp={isNp}
                  mobile
                  onClick={() => {
                    router.push(item.path)
                    setSidebarOpen(false)
                  }}
                />
              ))}
            </div>
            <PoweredBy />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 pt-14 md:ml-60 md:pt-0 lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
          <div className="mt-8 md:hidden">
            <PoweredBy />
          </div>
        </div>
      </main>
    </div>
  )
}
