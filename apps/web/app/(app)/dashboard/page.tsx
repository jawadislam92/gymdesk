'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  Clock,
  CreditCard,
  DollarSign,
  Plus,
  ScanLine,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, PageHeader } from '@/components/ui';

interface Dashboard {
  activeMembers: number;
  totalMembers: number;
  expiringSoon: number;
  todayCheckIns: number;
  revenueThisMonth: number;
}

const KPIS: {
  key: keyof Dashboard;
  label: string;
  icon: LucideIcon;
  tint: string;
  sub: string;
  money?: boolean;
}[] = [
  { key: 'activeMembers', label: 'Active members', icon: Users, tint: 'bg-orange-100 text-brand', sub: 'currently training with you' },
  { key: 'revenueThisMonth', label: 'Revenue this month', icon: DollarSign, tint: 'bg-green-100 text-green-600', sub: 'collected so far', money: true },
  { key: 'todayCheckIns', label: "Today's check-ins", icon: ScanLine, tint: 'bg-blue-100 text-blue-600', sub: 'visits logged today' },
  { key: 'expiringSoon', label: 'Expiring in 7 days', icon: Clock, tint: 'bg-amber-100 text-amber-600', sub: 'memberships to renew' },
  { key: 'totalMembers', label: 'Total members', icon: UserCheck, tint: 'bg-slate-100 text-slate-600', sub: 'on the books, all-time' },
];

const QUICK: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/members', label: 'Add member', icon: Plus },
  { href: '/check-in', label: 'Check-in', icon: ScanLine },
  { href: '/payments', label: 'Take payment', icon: CreditCard },
  { href: '/schedule', label: 'New class', icon: CalendarPlus },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<Dashboard>('/dashboard'),
  });
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div>
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ''}`}
        description="A live snapshot of your gym — members, check-ins, and revenue, with quick actions for the day's work."
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{(error as Error).message}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          const value = data ? (kpi.money ? `$${data[kpi.key].toLocaleString()}` : data[kpi.key].toLocaleString()) : '—';
          return (
            <Card key={kpi.key} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.tint}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight text-slate-900">{isLoading ? '…' : value}</div>
                <div className="mt-1 text-xs text-slate-400">{kpi.sub}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-brand group-hover:text-white">
                  <Icon size={17} />
                </span>
                {q.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
