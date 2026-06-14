'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input } from '@/components/ui';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string | number;
  isActive: boolean;
}

export default function PlansPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => apiFetch<Plan[]>('/membership-plans?includeInactive=true'),
  });

  const addPlan = useMutation({
    mutationFn: (body: { name: string; durationDays: number; price: number; description?: string }) =>
      apiFetch<Plan>('/membership-plans', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setShowAdd(false);
      void qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addPlan.mutate({
      name: String(form.get('name')),
      durationDays: Number(form.get('durationDays')),
      price: Number(form.get('price')),
      description: String(form.get('description') || '') || undefined,
    });
  }

  const plans = plansQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membership Plans</h1>
        <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Close' : 'Add plan'}</Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <form onSubmit={onAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input label="Name" name="name" required />
            <Input label="Duration (days)" name="durationDays" type="number" min={1} defaultValue={30} required />
            <Input label="Price" name="price" type="number" min={0} step="0.01" required />
            <Input label="Description" name="description" />
            <div className="sm:col-span-4">
              <Button type="submit" disabled={addPlan.isPending}>
                {addPlan.isPending ? 'Saving…' : 'Save plan'}
              </Button>
              {addPlan.error && (
                <span className="ml-3 text-sm text-red-600">{(addPlan.error as Error).message}</span>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              <Badge tone={p.isActive ? 'green' : 'slate'}>{p.isActive ? 'active' : 'archived'}</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">${Number(p.price)}</div>
            <div className="text-sm text-slate-500">{p.durationDays} days</div>
            {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
          </Card>
        ))}
        {plans.length === 0 && !plansQuery.isLoading && (
          <p className="text-slate-400">No plans yet.</p>
        )}
      </div>
    </div>
  );
}
