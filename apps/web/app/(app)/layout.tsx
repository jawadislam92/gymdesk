'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  BarChart3,
  BellRing,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Receipt,
  RefreshCw,
  ScanLine,
  Settings,
  ShoppingBag,
  Tag,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS } from '@gymflow/shared';
import { useAuth } from '@/lib/auth';

const NAV: { href: string; label: string; perm: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', perm: PERMISSIONS.DASHBOARD_VIEW, icon: LayoutDashboard },
  { href: '/members', label: 'Members', perm: PERMISSIONS.MEMBERS_MANAGE, icon: Users },
  { href: '/leads', label: 'Leads', perm: PERMISSIONS.MEMBERS_MANAGE, icon: UserPlus },
  { href: '/automations', label: 'Automations', perm: PERMISSIONS.MEMBERS_MANAGE, icon: BellRing },
  { href: '/schedule', label: 'Schedule', perm: PERMISSIONS.CLASSES_BOOK, icon: CalendarDays },
  { href: '/check-in', label: 'Check-in', perm: PERMISSIONS.ATTENDANCE_RECORD, icon: ScanLine },
  { href: '/plans', label: 'Plans', perm: PERMISSIONS.PLANS_MANAGE, icon: Tag },
  { href: '/renewals', label: 'Renewals', perm: PERMISSIONS.MEMBERSHIPS_RENEW, icon: RefreshCw },
  { href: '/payments', label: 'Payments', perm: PERMISSIONS.PAYMENTS_COLLECT, icon: Receipt },
  { href: '/shop', label: 'Shop', perm: PERMISSIONS.PAYMENTS_COLLECT, icon: ShoppingBag },
  { href: '/expenses', label: 'Expenses', perm: PERMISSIONS.DASHBOARD_VIEW, icon: Wallet },
  { href: '/trainers', label: 'Trainers', perm: PERMISSIONS.TRAINERS_MANAGE, icon: Dumbbell },
  { href: '/reports', label: 'Reports', perm: PERMISSIONS.DASHBOARD_VIEW, icon: BarChart3 },
  { href: '/settings', label: 'Settings', perm: PERMISSIONS.GYM_SETTINGS, icon: Settings },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, hasPermission, isMemberOnly, isPlatformAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (isPlatformAdmin) router.replace('/platform');
    else if (isMemberOnly) router.replace('/portal');
  }, [loading, user, isMemberOnly, isPlatformAdmin, router]);

  if (loading || !user || isMemberOnly || isPlatformAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  const items = NAV.filter((n) => hasPermission(n.perm));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-white/5 bg-ink text-slate-300">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-7 flex items-center gap-2.5 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-display text-lg font-extrabold text-white shadow-sm shadow-brand/30">
              G
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">GymFlow</span>
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-brand text-white shadow-sm shadow-brand/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={2.2}
                    className={active ? 'text-white' : 'text-slate-500 transition group-hover:text-white'}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
              {initials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user.fullName}</div>
              <div className="truncate text-xs capitalize text-slate-500">{user.roles.join(', ').replace(/_/g, ' ')}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
