'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Button, Card, Input, Select } from '@/components/ui';
import { dateStamp, downloadCsv } from '@/lib/csv';
import { printReceipt } from '@/lib/receipt';

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
  const [exporting, setExporting] = useState(false);

  const gymQuery = useQuery({
    queryKey: ['gym'],
    queryFn: () =>
      apiFetch<{ name: string; currency: string; address: string | null; city: string | null }>('/gym'),
  });
  const billingQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => apiFetch<{ enabled: boolean }>('/billing/status'),
  });
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

  const checkout = useMutation({
    mutationFn: (body: { memberId: string; amount: number }) =>
      apiFetch<{ url: string }>('/billing/checkout', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (r) => {
      window.location.href = r.url; // hand off to Stripe's hosted checkout
    },
    onError: (e) => setNotice((e as Error).message),
  });

  // When Stripe redirects back to /payments?paid=<session_id>, confirm + record it.
  useEffect(() => {
    const paid = new URLSearchParams(window.location.search).get('paid');
    if (!paid) return;
    window.history.replaceState({}, '', '/payments');
    if (paid === 'cancelled') {
      setNotice('Online payment cancelled.');
      return;
    }
    apiFetch<{ recorded: boolean }>('/billing/confirm', {
      method: 'POST',
      body: JSON.stringify({ sessionId: paid }),
    })
      .then((r) => {
        setNotice(r.recorded ? 'Online payment received ✓' : 'Payment was not completed.');
        void qc.invalidateQueries({ queryKey: ['payments'] });
        void qc.invalidateQueries({ queryKey: ['dashboard'] });
      })
      .catch((e: unknown) => setNotice((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    record.mutate({
      memberId: String(form.get('memberId')),
      amount: Number(form.get('amount')),
      method: String(form.get('method')),
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const all: Payment[] = [];
      let page = 1;
      for (;;) {
        const res = await apiFetch<Paginated<Payment>>(`/payments?page=${page}&pageSize=100`);
        all.push(...res.data);
        if (all.length >= res.meta.total || res.data.length === 0) break;
        page += 1;
      }
      downloadCsv(
        `payments-${dateStamp()}.csv`,
        all.map((p) => ({
          invoice: p.invoiceNumber ?? '',
          member: p.memberName ?? p.memberCode ?? '',
          method: p.method,
          amount: p.amount,
          date: p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : '',
        })),
      );
    } finally {
      setExporting(false);
    }
  }

  function receiptFor(p: Payment) {
    const g = gymQuery.data;
    printReceipt({
      gymName: g?.name ?? 'Gym',
      gymAddress: [g?.address, g?.city].filter(Boolean).join(', ') || null,
      title: 'Payment receipt',
      reference: p.invoiceNumber ?? p.id,
      dateLabel: p.paidAt ? new Date(p.paidAt).toLocaleString() : '—',
      method: p.method,
      currency: g?.currency ?? 'USD',
      lines: [{ name: p.memberName ?? p.memberCode ?? 'Member', amount: p.amount }],
      total: p.amount,
    });
  }

  const payments = paymentsQuery.data?.data ?? [];
  const members = membersQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button variant="ghost" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

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
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Saving…' : 'Record'}
            </Button>
            {billingQuery.data?.enabled && (
              <Button
                type="button"
                variant="ghost"
                disabled={checkout.isPending}
                onClick={(e) => {
                  const form = e.currentTarget.form;
                  if (!form) return;
                  const f = new FormData(form);
                  const memberId = String(f.get('memberId') || '');
                  const amount = Number(f.get('amount'));
                  if (!memberId || !amount) {
                    setNotice('Pick a member and amount first.');
                    return;
                  }
                  checkout.mutate({ memberId, amount });
                }}
              >
                {checkout.isPending ? 'Redirecting…' : 'Pay by card (online)'}
              </Button>
            )}
          </div>
        </form>
        {billingQuery.data && !billingQuery.data.enabled && (
          <p className="mt-3 text-xs text-slate-400">
            💳 Online card payments are built in — add your Stripe keys to switch them on
            (see DEPLOYMENT.md §5).
          </p>
        )}
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
              <th className="px-4 py-3"></th>
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
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => receiptFor(p)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && !paymentsQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
