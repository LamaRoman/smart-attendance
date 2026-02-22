'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  BarChart3, QrCode, Clock, FileText, Users, CalendarDays,
  CreditCard, Settings, LogOut, Calendar, Menu, X, Banknote, Receipt,
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import PoweredBy from './PoweredBy';

interface NavItem {
  path: string;
  labelNp: string;
  labelEn: string;
  icon: React.ElementType;
  featureKey?: string;
  // When true, item only appears for ORG_ADMIN — not SUPER_ADMIN or EMPLOYEE
  orgAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin',            labelNp: 'ड्यासबोर्ड', labelEn: 'Dashboard',  icon: BarChart3 },
  { path: '/admin/qr',         labelNp: 'QR कोड',      labelEn: 'QR Code',    icon: QrCode,       featureKey: 'staticQR' },
  { path: '/admin/attendance', labelNp: 'उपस्थिति',    labelEn: 'Attendance', icon: Clock },
  { path: '/admin/reports',    labelNp: 'प्रतिवेदन',   labelEn: 'Reports',    icon: FileText,     featureKey: 'reports' },
  { path: '/users',            labelNp: 'प्रयोगकर्ता', labelEn: 'Users',      icon: Users },
  { path: '/leaves',           labelNp: 'बिदा',         labelEn: 'Leaves',     icon: CalendarDays, featureKey: 'leave' },
  { path: '/payroll',          labelNp: 'तलब',          labelEn: 'Payroll',    icon: CreditCard,   featureKey: 'payroll' },
  { path: '/holidays',         labelNp: 'बिदाहरू',      labelEn: 'Holidays',   icon: Calendar,     featureKey: 'holidaySync' },
  { path: "/admin/billing",   labelNp: "बिलिङ",        labelEn: "Billing",    icon: Receipt,      orgAdminOnly: true },
  { path: '/settings',         labelNp: 'सेटिङ्स',      labelEn: 'Settings',   icon: Settings },
  // Pay: only ORG_ADMIN should see this — SUPER_ADMIN manages billing differently
  { path: '/admin/pay',        labelNp: 'भुक्तानी',     labelEn: 'Pay',        icon: Banknote,     orgAdminOnly: true },
];

// Defined outside AdminLayout to avoid TypeScript JSX parsing errors
// that occur when components are defined inside another component's body.
function NavButton({
  item,
  active,
  isNp,
  mobile = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  isNp: boolean;
  mobile?: boolean;
  onClick: () => void;
}) {
  const isPayItem = item.path === '/admin/pay';
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 rounded-md font-medium transition-colors
        ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'}
        ${active
          ? 'bg-slate-900 text-white'
          : isPayItem
            ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
      `}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {isNp ? item.labelNp : item.labelEn}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, language, features } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isNp = language === 'NEPALI';

  const featureMap: Record<string, boolean> = {
    staticQR: true,
    reports: true,
    leave: true,
    payroll: true,
    holidaySync: true,
  };

  // user.role is typed as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'EMPLOYEE' in auth-context
  const isOrgAdmin = user?.role === 'ORG_ADMIN';

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.orgAdminOnly && !isOrgAdmin) return false;
    if (!item.featureKey) return true;
    return featureMap[item.featureKey] !== false;
  });

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-100">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">Smart Attendance</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {isNp ? 'प्रशासक' : 'Admin'}
              </p>
            </div>
            {features.notifications && <NotificationBell />}
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <PoweredBy />
      </aside>

      {/* ── Mobile header ───────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-md"
          >
            {sidebarOpen
              ? <X    className="w-5 h-5 text-slate-600" />
              : <Menu className="w-5 h-5 text-slate-600" />}
          </button>
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">Smart Attendance</span>
        </div>
        <div className="flex items-center gap-1">
          {features.notifications && <NotificationBell />}
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-md"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute left-0 top-14 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {visibleNav.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  isNp={isNp}
                  mobile
                  onClick={() => { router.push(item.path); setSidebarOpen(false); }}
                />
              ))}
            </div>
            <PoweredBy />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 lg:ml-64 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
          <div className="md:hidden mt-8">
            <PoweredBy />
          </div>
        </div>
      </main>
    </div>
  );
}