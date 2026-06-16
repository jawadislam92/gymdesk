'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Select } from '@/components/ui';

interface Renewal {
  membershipId: string;
  memberId: string;
  memberCode: string | null;
  memberName: string | null;
  plan: string | null;
  endDate: string;
  autoRenew: boolean;
  daysRemaining: number;
}

export default function RenewalsPage() {
  const qc = useQueryClient();
  const [days, setDays] = useState(14);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['renewals', days], queryFn: () => apiFetch<Renewal[]>(`/renewals?days=${days}`) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['renewals'] });

  const remind = useMutation({
    mutationFn: (id: string) => apiFetch<{ delivered: boolean }>(`/renewals/${id}/remind`, { method: 'POST' }),
    onSuccess: (r) =>
      setNotice(r.delivered ? 'Reminder sent to the member ✓' : 'Member has no app login yet — reach out directly.'),
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) =>
      apiFetch(`/renewals/${v.id}/auto-renew`, { method: 'PATCH', body: JSON.stringify({ enabled: v.enabled }) }),
    onSuccess: refresh,
  });
  const runAuto = useMutation({
    mutationFn: () => apiFetch<{ renewed: number }>('/renewals/run', { method: 'POST' }),
    onSuccess: (r) => {
      setNotice(`Auto-renewed ${r.renewed} membership${r.renewed === 1 ? '' : 's'} — invoices raised.`);
      refresh();
    },
  });

  const rows = q.data ?? [];
  const expired = rows.filter((r) => r.daysRemaining <= 0).length;
  const autoOn = rows.filter((r) => r.autoRenew).length;
  const STATS = [
    { label: `Expiring (next ${days} days)`, value: rows.length, tone: 'text-slate-900' },
    { label: 'Already expired', value: expired, tone: expired > 0 ? 'text-red-600' : 'text-slate-900' },
    { label: 'On auto-renew', value: autoOn, tone: 'text-green-600' },
  ];

  return (
    <div>
      <PageHeader
        title="Renewals"
        description="Stay ahead of expiring memberships. Nudge members to renew, turn on auto-renew so it happens by itself, and process due renewals in one click."
      >
        <Button variant="ghost" disabled={runAuto.isPending} onClick={() => runAuto.mutate()}>
          {runAuto.isPending ? 'Running…' : 'Run auto-renewals'}
        </Button>
        <div className="w-40">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </Select>
        </div>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      <div className="mb-6 grid grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <div className="text-sm font-medium text-slate-500">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold tracking-tight ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Auto-renew</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const tone = r.daysRemaining <= 0 ? 'red' : r.daysRemaining <= 7 ? 'amber' : 'green';
              return (
                <tr key={r.membershipId} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/members/${r.memberId}`} className="font-semibold text-slate-800 hover:text-brand">
                      {r.memberName ?? r.memberCode}
                    </Link>
                    {r.memberCode && <div className="font-mono text-xs text-slate-400">{r.memberCode}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.plan}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone}>{r.daysRemaining <= 0 ? 'expired' : `${r.daysRemaining}d left`}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: r.membershipId, enabled: !r.autoRenew })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        r.autoRenew ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {r.autoRenew ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" disabled={remind.isPending} onClick={() => remind.mutate(r.membershipId)}>
                      Remind
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No memberships expiring in this window. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
