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
import { Card } from '@/components/ui';

interface Dashboard {
  activeMembers: number;
  totalMembers: number;
  expiringSoon: number;
  todayCheckIns: number;
  revenueThisMonth: number;
}

const KPIS: { key: keyof Dashboard; label: string; icon: LucideIcon; tint: string; money?: boolean }[] = [
  { key: 'activeMembers', label: 'Active members', icon: Users, tint: 'bg-green-100 text-green-600' },
  { key: 'expiringSoon', label: 'Expiring in 7 days', icon: Clock, tint: 'bg-amber-100 text-amber-600' },
  { key: 'todayCheckIns', label: "Today's check-ins", icon: ScanLine, tint: 'bg-blue-100 text-blue-600' },
  { key: 'revenueThisMonth', label: 'Revenue this month', icon: DollarSign, tint: 'bg-indigo-100 text-brand', money: true },
  { key: 'totalMembers', label: 'Total members', icon: UserCheck, tint: 'bg-slate-100 text-slate-600' },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back{firstName ? `, ${firstName}` : ''} 👋</h1>
        <p className="text-sm text-slate-500">Here&apos;s how your gym is doing today.</p>
      </div>

      {error && <p className="text-red-600">{(error as Error).message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          const value = data ? (kpi.money ? `$${data[kpi.key].toLocaleString()}` : data[kpi.key]) : '—';
          return (
            <Card key={kpi.key} className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.tint}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="text-sm text-slate-500">{kpi.label}</div>
                <div className="text-2xl font-bold text-slate-800">{isLoading ? '…' : value}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand hover:text-brand"
              >
                <Icon size={16} /> {q.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
