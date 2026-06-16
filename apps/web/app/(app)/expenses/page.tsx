'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  incurredOn: string;
}

const CATEGORIES = ['rent', 'salary', 'utilities', 'equipment', 'other'];
const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', AED: 'AED ' };

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['expenses'], queryFn: () => apiFetch<Expense[]>('/expenses') });
  const gymQ = useQuery({ queryKey: ['gym'], queryFn: () => apiFetch<{ currency: string }>('/gym') });
  const currency = gymQ.data?.currency ?? 'USD';
  const sym = SYMBOL[currency] ?? `${currency} `;
  const money = (n: number) => `${sym}${n.toLocaleString()}`;

  const add = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/expenses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setNotice('Expense recorded');
      setModalOpen(false);
      void qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    add.mutate({
      category: String(f.get('category')),
      amount: Number(f.get('amount')),
      incurredOn: new Date(`${String(f.get('incurredOn'))}T12:00:00`).toISOString(),
      description: String(f.get('description') ?? '').trim() || undefined,
    });
  }

  const rows = q.data ?? [];
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const thisMonth = rows
    .filter((e) => {
      const d = new Date(e.incurredOn);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    total: rows.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track what the gym spends — rent, salaries, utilities, equipment — so you see real profit, not just revenue."
      >
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add expense
        </Button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm font-medium text-slate-500">This month</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{money(thisMonth)}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-slate-500">All-time total</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{money(total)}</div>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-medium text-slate-500">By category</div>
          {byCategory.length === 0 ? (
            <div className="text-sm text-slate-400">No expenses yet</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {byCategory.map((c) => (
                <span key={c.category} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  <span className="capitalize">{c.category}</span> {money(c.total)}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e) => (
              <tr key={e.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Badge tone="slate">
                    <span className="capitalize">{e.category}</span>
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(e.incurredOn).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-medium">{money(e.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Delete this expense?')) del.mutate(e.id);
                    }}
                    aria-label="Delete expense"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No expenses recorded yet — add your first one.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-3 font-semibold" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-bold">{money(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add an expense"
        description="Record a cost so your profit reporting stays accurate."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="expense-form" disabled={add.isPending}>
              {add.isPending ? 'Saving…' : 'Add expense'}
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" name="category" defaultValue="rent">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
            <Input label={`Amount (${currency})`} name="amount" type="number" min={0} step="0.01" required />
          </div>
          <Input label="Date" name="incurredOn" type="date" defaultValue={todayLocal} required />
          <Textarea label="Description (optional)" name="description" rows={2} placeholder="e.g. March studio rent" />
          {add.error && <p className="text-sm text-red-600">{(add.error as Error).message}</p>}
        </form>
      </Modal>
    </div>
  );
}
