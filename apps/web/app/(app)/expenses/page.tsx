'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  incurredOn: string;
}

const CATEGORIES = ['rent', 'salary', 'utilities', 'equipment', 'other'];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['expenses'], queryFn: () => apiFetch<Expense[]>('/expenses') });
  const add = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/expenses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['expenses'] }),
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
      incurredOn: new Date(String(f.get('incurredOn'))).toISOString(),
      description: String(f.get('description') || '') || undefined,
    });
    e.currentTarget.reset();
  }

  const rows = q.data ?? [];
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Expenses</h1>

      <Card className="mb-6">
        <form onSubmit={onAdd} className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Select label="Category" name="category" defaultValue="rent">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </Select>
          <Input label="Amount" name="amount" type="number" min={0} step="0.01" required />
          <Input label="Date" name="incurredOn" type="date" defaultValue={today} required />
          <div className="col-span-2">
            <Input label="Description" name="description" />
          </div>
          <div className="col-span-2 sm:col-span-5">
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? 'Saving…' : 'Add expense'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
              <tr key={e.id}>
                <td className="px-4 py-3">
                  <Badge>{e.category}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(e.incurredOn).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-medium">${e.amount}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del.mutate(e.id)} className="text-xs text-slate-400 hover:text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No expenses recorded yet.
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
                <td className="px-4 py-3 text-right font-bold">${total.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
