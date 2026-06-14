'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Overview {
  totalGyms: number;
  totalMembers: number;
  totalRevenue: number;
  activeGyms: number;
}
interface Gym {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  memberCount: number;
  createdAt: string;
}

const PLANS = ['starter', 'professional', 'enterprise'];
const STATUSES = ['trialing', 'active', 'past_due', 'cancelled'];
const statusTone: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  active: 'green',
  trialing: 'amber',
  past_due: 'red',
  cancelled: 'slate',
};

export default function PlatformPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const overviewQ = useQuery({ queryKey: ['platform-overview'], queryFn: () => apiFetch<Overview>('/platform/overview') });
  const gymsQ = useQuery({ queryKey: ['platform-gyms'], queryFn: () => apiFetch<Gym[]>('/platform/gyms') });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['platform-gyms'] });
    void qc.invalidateQueries({ queryKey: ['platform-overview'] });
  };

  const createGym = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/platform/gyms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setShowAdd(false);
      setNotice('Gym created ✓');
      refresh();
    },
    onError: (e) => setNotice((e as Error).message),
  });

  const updateSub = useMutation({
    mutationFn: (v: { id: string; subscriptionPlan?: string; subscriptionStatus?: string }) =>
      apiFetch(`/platform/gyms/${v.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ subscriptionPlan: v.subscriptionPlan, subscriptionStatus: v.subscriptionStatus }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform-gyms'] }),
  });

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createGym.mutate({
      gymName: String(f.get('gymName')),
      ownerFullName: String(f.get('ownerFullName')),
      ownerEmail: String(f.get('ownerEmail')),
      ownerPassword: String(f.get('ownerPassword')),
    });
  }

  const o = overviewQ.data;
  const gyms = gymsQ.data ?? [];
  const kpis = [
    { label: 'Gyms', value: o?.totalGyms ?? '—' },
    { label: 'Active gyms', value: o?.activeGyms ?? '—' },
    { label: 'Members (all gyms)', value: o?.totalMembers ?? '—' },
    { label: 'Revenue (all gyms)', value: o ? `$${o.totalRevenue.toLocaleString()}` : '—' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform overview</h1>
        <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Close' : 'Add gym'}</Button>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-1 text-3xl font-bold">{k.value}</div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Onboard a new gym</h2>
          <form onSubmit={onCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Gym name" name="gymName" required />
            <Input label="Owner name" name="ownerFullName" required />
            <Input label="Owner email" name="ownerEmail" type="email" required />
            <Input label="Owner temp password" name="ownerPassword" minLength={8} required />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createGym.isPending}>
                {createGym.isPending ? 'Creating…' : 'Create gym + owner'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Gym</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3 text-right">Members</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gyms.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3 text-slate-500">{g.ownerEmail ?? g.ownerName ?? '—'}</td>
                <td className="px-4 py-3 text-right">{g.memberCount}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs capitalize"
                    value={g.subscriptionPlan}
                    onChange={(e) => updateSub.mutate({ id: g.id, subscriptionPlan: e.target.value })}
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[g.subscriptionStatus] ?? 'slate'}>{g.subscriptionStatus}</Badge>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={g.subscriptionStatus}
                      onChange={(e) => updateSub.mutate({ id: g.id, subscriptionStatus: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {gyms.length === 0 && !gymsQ.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No gyms yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
