'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  daysRemaining: number;
}

export default function RenewalsPage() {
  const [days, setDays] = useState(14);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['renewals', days],
    queryFn: () => apiFetch<Renewal[]>(`/renewals?days=${days}`),
  });
  const remind = useMutation({
    mutationFn: (id: string) => apiFetch<{ delivered: boolean }>(`/renewals/${id}/remind`, { method: 'POST' }),
    onSuccess: (r) =>
      setNotice(r.delivered ? 'Reminder sent to the member ✓' : 'Member has no app login yet — reach out directly.'),
  });

  const rows = q.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Renewals</h1>
          {rows.length > 0 && <Badge tone="amber">{rows.length}</Badge>}
        </div>
        <div className="w-44">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </Select>
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
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
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
