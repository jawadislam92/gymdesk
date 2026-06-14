'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}
interface Plan {
  id: string;
  name: string;
  price: string | number;
  durationDays: number;
}

const statusTone: Record<string, 'green' | 'red' | 'amber' | 'slate'> = {
  active: 'green',
  expired: 'red',
  frozen: 'amber',
  cancelled: 'slate',
};

export default function MembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [sellFor, setSellFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ['members', search],
    queryFn: () =>
      apiFetch<Paginated<Member>>(`/members?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: () => apiFetch<Plan[]>('/membership-plans') });

  const addMember = useMutation({
    mutationFn: (body: { fullName: string; phone?: string; email?: string }) =>
      apiFetch<Member>('/members', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (m) => {
      setShowAdd(false);
      setNotice(`Added ${m.fullName} (${m.memberCode})`);
      void qc.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const sell = useMutation({
    mutationFn: async ({ memberId, plan }: { memberId: string; plan: Plan }) => {
      const membership = await apiFetch<{ id: string }>('/memberships', {
        method: 'POST',
        body: JSON.stringify({ memberId, planId: plan.id }),
      });
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          memberId,
          membershipId: membership.id,
          amount: Number(plan.price),
          method: 'cash',
        }),
      });
    },
    onSuccess: () => {
      setSellFor(null);
      setNotice('Membership sold and payment recorded');
      void qc.invalidateQueries({ queryKey: ['members'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addMember.mutate({
      fullName: String(form.get('fullName')),
      phone: String(form.get('phone') || '') || undefined,
      email: String(form.get('email') || '') || undefined,
    });
  }

  const members = membersQuery.data?.data ?? [];
  const plans = plansQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Close' : 'Add member'}</Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>
      )}

      {showAdd && (
        <Card className="mb-6">
          <form onSubmit={onAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Full name" name="fullName" required />
            <Input label="Phone" name="phone" />
            <Input label="Email (optional)" name="email" type="email" />
            <div className="sm:col-span-3">
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? 'Saving…' : 'Save member'}
              </Button>
              {addMember.error && (
                <span className="ml-3 text-sm text-red-600">{(addMember.error as Error).message}</span>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 max-w-xs">
        <Input placeholder="Search name, phone or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-mono text-xs">{m.memberCode}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/members/${m.id}`} className="text-brand hover:underline">
                    {m.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{m.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[m.status] ?? 'slate'}>{m.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {sellFor === m.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        id={`plan-${m.id}`}
                        defaultValue={plans[0]?.id}
                        className="!w-44"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${Number(p.price)})
                          </option>
                        ))}
                      </Select>
                      <Button
                        disabled={sell.isPending || plans.length === 0}
                        onClick={() => {
                          const sel = (document.getElementById(`plan-${m.id}`) as HTMLSelectElement)?.value;
                          const plan = plans.find((p) => p.id === sel);
                          if (plan) sell.mutate({ memberId: m.id, plan });
                        }}
                      >
                        Charge
                      </Button>
                      <Button variant="ghost" onClick={() => setSellFor(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setSellFor(m.id)}>
                      Sell plan
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && !membersQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
