'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Select } from '@/components/ui';

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Renewals</h1>
          {rows.length > 0 && <Badge tone="amber">{rows.length}</Badge>}
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                <tr key={r.membershipId}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/members/${r.memberId}`} className="text-brand hover:underline">
                      {r.memberName ?? r.memberCode}
                    </Link>
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
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
