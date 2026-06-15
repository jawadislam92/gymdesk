'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string | number;
  currency: string;
  classCredits: number | null;
  benefits: string[] | null;
  isActive: boolean;
}

type PlanBody = {
  name: string;
  price: number;
  durationDays: number;
  currency: string;
  classCredits: number | null;
  benefits: string[];
  description?: string;
  isActive: boolean;
};

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', AED: 'AED ' };
function money(amount: number, currency: string) {
  const s = SYMBOL[currency] ?? `${currency} `;
  return `${s}${amount.toLocaleString()}`;
}
function benefitsOf(p: Plan): string[] {
  return Array.isArray(p.benefits) ? p.benefits : [];
}

export default function PlansPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => apiFetch<Plan[]>('/membership-plans?includeInactive=true'),
  });
  const gymQuery = useQuery({
    queryKey: ['gym'],
    queryFn: () => apiFetch<{ currency: string }>('/gym'),
  });
  const gymCurrency = gymQuery.data?.currency ?? 'USD';

  const refresh = () => void qc.invalidateQueries({ queryKey: ['plans'] });

  const save = useMutation({
    mutationFn: (body: PlanBody) =>
      editing
        ? apiFetch<Plan>(`/membership-plans/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : apiFetch<Plan>('/membership-plans', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (p) => {
      setNotice(editing ? `Updated “${p.name}”` : `Created “${p.name}”`);
      setModalOpen(false);
      setEditing(null);
      refresh();
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/membership-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setNotice('Plan archived');
      refresh();
    },
  });

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Plan) {
    setEditing(p);
    setModalOpen(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const credits = String(f.get('classCredits') ?? '').trim();
    save.mutate({
      name: String(f.get('name') ?? '').trim(),
      price: Number(f.get('price')),
      durationDays: Number(f.get('durationDays')),
      currency: (String(f.get('currency') ?? '').trim() || gymCurrency).toUpperCase().slice(0, 3),
      classCredits: credits === '' ? null : Number(credits),
      benefits: String(f.get('benefits') ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      description: String(f.get('description') ?? '').trim() || undefined,
      isActive: f.get('isActive') === 'on',
    });
  }

  const plans = plansQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Membership plans"
        description="The packages you sell. Set price, length, class access, and perks — edit any plan anytime; existing members keep what they bought."
      >
        <Button onClick={openAdd}>
          <Plus size={16} /> Add plan
        </Button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const benefits = benefitsOf(p);
          return (
            <Card key={p.id} className={`flex flex-col ${p.isActive ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <Badge tone={p.isActive ? 'green' : 'slate'}>{p.isActive ? 'active' : 'archived'}</Badge>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {money(Number(p.price), p.currency)}
                </span>
                <span className="text-sm text-slate-400">/ {p.durationDays} days</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-brand">
                {p.classCredits == null ? 'Unlimited classes' : `${p.classCredits} class credits`}
              </div>

              {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}

              {benefits.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Button variant="ghost" onClick={() => openEdit(p)}>
                  <Pencil size={15} /> Edit
                </Button>
                {p.isActive && (
                  <button
                    onClick={() => {
                      if (confirm(`Archive “${p.name}”? It won't be sellable, but current members keep it.`)) {
                        archive.mutate(p.id);
                      }
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    Archive
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {plans.length === 0 && !plansQuery.isLoading && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <p className="py-6 text-center text-slate-400">
              No plans yet. Add your first membership plan to start selling.
            </p>
          </Card>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit “${editing.name}”` : 'Add a membership plan'}
        description="Members buy this package; the price and length drive billing and renewals."
        wide
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="plan-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Plan name" name="name" required placeholder="e.g. Monthly Unlimited" defaultValue={editing?.name ?? ''} />
            <Input
              label="Price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={editing ? Number(editing.price) : ''}
            />
            <Input
              label="Duration (days)"
              name="durationDays"
              type="number"
              min={1}
              required
              defaultValue={editing?.durationDays ?? 30}
            />
            <Input
              label="Currency"
              name="currency"
              maxLength={3}
              placeholder={gymCurrency}
              defaultValue={editing?.currency ?? gymCurrency}
            />
            <Input
              label="Class credits"
              name="classCredits"
              type="number"
              min={0}
              placeholder="Blank = unlimited"
              defaultValue={editing && editing.classCredits != null ? editing.classCredits : ''}
            />
            <Input label="Short description" name="description" defaultValue={editing?.description ?? ''} />
          </div>
          <Textarea
            label="Benefits (one per line)"
            name="benefits"
            rows={4}
            placeholder={'Unlimited group classes\nFree locker\n1 guest pass / month'}
            defaultValue={editing ? benefitsOf(editing).join('\n') : ''}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            Active — available to sell
          </label>
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </form>
      </Modal>
    </div>
  );
}
