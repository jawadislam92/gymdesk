'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PERMISSIONS } from '@gymflow/shared';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Dashboard', perm: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/members', label: 'Members', perm: PERMISSIONS.MEMBERS_MANAGE },
  { href: '/plans', label: 'Plans', perm: PERMISSIONS.PLANS_MANAGE },
  { href: '/schedule', label: 'Schedule', perm: PERMISSIONS.CLASSES_BOOK },
  { href: '/trainers', label: 'Trainers', perm: PERMISSIONS.TRAINERS_MANAGE },
  { href: '/payments', label: 'Payments', perm: PERMISSIONS.PAYMENTS_COLLECT },
  { href: '/check-in', label: 'Check-in', perm: PERMISSIONS.ATTENDANCE_RECORD },
  { href: '/reports', label: 'Reports', perm: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/settings', label: 'Settings', perm: PERMISSIONS.GYM_SETTINGS },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const items = NAV.filter((n) => hasPermission(n.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div>
          <div className="mb-6 px-2 text-xl font-bold text-brand">GymFlow</div>
          <nav className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-4 text-sm">
          <div className="px-2 font-medium text-slate-700">{user.fullName}</div>
          <div className="px-2 text-xs text-slate-400">{user.roles.join(', ')}</div>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
