'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui';

interface Dashboard {
  activeMembers: number;
  totalMembers: number;
  expiringSoon: number;
  todayCheckIns: number;
  revenueThisMonth: number;
}

const KPIS: { key: keyof Dashboard; label: string; money?: boolean }[] = [
  { key: 'activeMembers', label: 'Active members' },
  { key: 'expiringSoon', label: 'Expiring in 7 days' },
  { key: 'todayCheckIns', label: "Today's check-ins" },
  { key: 'revenueThisMonth', label: 'Revenue this month', money: true },
  { key: 'totalMembers', label: 'Total members' },
];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<Dashboard>('/dashboard'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {isLoading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KPIS.map((kpi) => (
            <Card key={kpi.key}>
              <div className="text-sm text-slate-500">{kpi.label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-800">
                {kpi.money ? `$${data[kpi.key].toLocaleString()}` : data[kpi.key]}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
