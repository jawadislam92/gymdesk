'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Button, Card, Input, Select } from '@/components/ui';

interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
}
interface Payment {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  method: string;
  memberName: string | null;
  memberCode: string | null;
  paidAt: string | null;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: () => apiFetch<Paginated<Payment>>('/payments?pageSize=50'),
  });
  const membersQuery = useQuery({
    queryKey: ['members', 'forpay'],
    queryFn: () => apiFetch<Paginated<Member>>('/members?pageSize=100'),
  });

  const record = useMutation({
    mutationFn: (body: { memberId: string; amount: number; method: string }) =>
      apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (p) => {
      setNotice(`Recorded ${p.invoiceNumber} — $${p.amount}`);
      void qc.invalidateQueries({ queryKey: ['payments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function onRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    record.mutate({
      memberId: String(form.get('memberId')),
      amount: Number(form.get('amount')),
      method: String(form.get('method')),
    });
  }

  const payments = paymentsQuery.data?.data ?? [];
  const members = membersQuery.data?.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payments</h1>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Record a payment</h2>
        {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}
        <form onSubmit={onRecord} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Select label="Member" name="memberId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.memberCode} — {m.fullName}
              </option>
            ))}
          </Select>
          <Input label="Amount" name="amount" type="number" min={0} step="0.01" required />
          <Select label="Method" name="method" defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="bank">Bank</option>
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Saving…' : 'Record'}
            </Button>
          </div>
        </form>
        {record.error && <p className="mt-2 text-sm text-red-600">{(record.error as Error).message}</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.invoiceNumber}</td>
                <td className="px-4 py-3">{p.memberName ?? p.memberCode}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{p.method}</td>
                <td className="px-4 py-3 text-right font-medium">${p.amount}</td>
                <td className="px-4 py-3 text-slate-500">
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
            {payments.length === 0 && !paymentsQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
