'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  BarChart3, Clock, FileText, CalendarDays,
  CreditCard, LogOut, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import PoweredBy from './PoweredBy';
import { t, Language } from '@/lib/i18n';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/accountant',            labelKey: 'nav.dashboard',  icon: BarChart3    },
  { path: '/accountant/attendance', labelKey: 'nav.attendance', icon: Clock        },
  { path: '/leaves',                labelKey: 'nav.leaves',     icon: CalendarDays },
  { path: '/payroll',               labelKey: 'nav.payroll',    icon: CreditCard   },
  { path: '/accountant/reports',    labelKey: 'nav.reports',    icon: FileText     },
];

function NavButton({
  item, active, lang, mobile = false, onClick,
}: {
  item: NavItem; active: boolean; lang: Language; mobile?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 rounded-md font-medium transition-colors
        ${mobile ? 'py-2.5 text-sm' : 'py-2 text-[13px]'}
        ${active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
      `}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {t(item.labelKey, lang)}
    </button>
  );
}

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, language, features } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lang = language as Language;

  const isActive = (path: string) => {
    if (path === '/accountant') return pathname === '/accountant';
    if (path === '/payroll') return pathname.startsWith('/payroll');
    return pathname.startsWith(path);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-100">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">
            {t('common.appName', lang)}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              active={isActive(item.path)}
              lang={lang}
              onClick={() => router.push(item.path)}
            />
          ))}
        </nav>

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
                {lang === 'NEPALI' ? 'लेखापाल' : 'Accountant'}
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

      {/* Mobile header */}
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
          <span className="font-semibold text-slate-900 text-sm">
            {t('common.appName', lang)}
          </span>
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

      {/* Mobile sidebar overlay */}
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
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  lang={lang}
                  mobile
                  onClick={() => { router.push(item.path); setSidebarOpen(false); }}
                />
              ))}
            </div>
            <PoweredBy />
          </div>
        </div>
      )}

      {/* Main content */}
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