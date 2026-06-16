'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ChevronDown, Pencil, Plus, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Textarea } from '@/components/ui';

interface Trainer {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  hourlyRate: number | null;
  isActive: boolean;
  memberCount: number;
}
interface TrainerMember {
  id: string;
  memberCode: string;
  fullName: string | null;
  status: string;
}

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', AED: 'AED ' };

export default function TrainersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trainersQ = useQuery({ queryKey: ['trainers'], queryFn: () => apiFetch<Trainer[]>('/trainers') });
  const gymQ = useQuery({ queryKey: ['gym'], queryFn: () => apiFetch<{ currency: string }>('/gym') });
  const membersQ = useQuery({
    queryKey: ['trainer-members', open],
    queryFn: () => apiFetch<TrainerMember[]>(`/trainers/${open}/members`),
    enabled: Boolean(open),
  });
  const currency = gymQ.data?.currency ?? 'USD';
  const sym = SYMBOL[currency] ?? `${currency} `;

  const refresh = () => void qc.invalidateQueries({ queryKey: ['trainers'] });

  const save = useMutation({
    mutationFn: (b: Record<string, unknown>) =>
      editing
        ? apiFetch(`/trainers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(b) })
        : apiFetch('/trainers', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => {
      setNotice(editing ? 'Trainer updated' : 'Trainer added');
      setModalOpen(false);
      setEditing(null);
      refresh();
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/trainers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setNotice('Trainer archived');
      refresh();
    },
  });

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Trainer) {
    setEditing(t);
    setModalOpen(true);
  }
  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    const rate = String(f.get('hourlyRate') ?? '').trim();
    save.mutate({
      fullName: String(f.get('fullName') ?? '').trim(),
      email: str('email'),
      phone: str('phone'),
      specialization: str('specialization'),
      bio: str('bio'),
      hourlyRate: rate === '' ? undefined : Number(rate),
      isActive: f.get('isActive') === 'on',
    });
  }

  const trainers = trainersQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Trainers"
        description="Your coaching team. Add trainers, set their specialisation and rate, assign members, and see who each one trains."
      >
        <Button onClick={openAdd}>
          <Plus size={16} /> Add trainer
        </Button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

      <div className="space-y-3">
        {trainers.map((t) => (
          <Card key={t.id} className={t.isActive ? '' : 'opacity-60'}>
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => setOpen(open === t.id ? null : t.id)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {(t.fullName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span>
                  <span className="block font-semibold text-slate-800">
                    {t.fullName}
                    {!t.isActive && <span className="ml-2 text-xs font-normal text-slate-400">(archived)</span>}
                  </span>
                  <span className="block text-sm text-slate-500">{t.specialization ?? t.email ?? '—'}</span>
                </span>
              </button>
              <div className="flex items-center gap-2">
                {t.hourlyRate != null && (
                  <span className="hidden text-sm font-medium text-slate-500 sm:inline">
                    {sym}
                    {t.hourlyRate}/hr
                  </span>
                )}
                <Badge tone="blue">
                  <Users size={11} /> {t.memberCount}
                </Badge>
                <button
                  onClick={() => openEdit(t)}
                  aria-label="Edit trainer"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setOpen(open === t.id ? null : t.id)}
                  aria-label="Show members"
                  className={`rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 ${open === t.id ? 'rotate-180' : ''}`}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
            {open === t.id && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                {t.bio && <p className="mb-3 text-sm text-slate-500">{t.bio}</p>}
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned members</div>
                <ul className="divide-y divide-slate-100 text-sm">
                  {(membersQ.data ?? []).map((m) => (
                    <li key={m.id} className="flex justify-between py-2">
                      <span>
                        <span className="font-mono text-xs text-slate-400">{m.memberCode}</span> {m.fullName}
                      </span>
                      <span className="text-slate-500">{m.status}</span>
                    </li>
                  ))}
                  {membersQ.data?.length === 0 && <li className="py-2 text-slate-400">No members assigned yet.</li>}
                </ul>
                {t.isActive && (
                  <button
                    onClick={() => {
                      if (confirm(`Archive ${t.fullName}? They stay on member records but leave the active roster.`)) {
                        archive.mutate(t.id);
                      }
                    }}
                    className="mt-3 text-xs font-semibold text-slate-400 transition hover:text-red-600"
                  >
                    Archive trainer
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
        {trainers.length === 0 && !trainersQ.isLoading && (
          <Card>
            <p className="py-6 text-center text-slate-400">No trainers yet — add your first coach.</p>
          </Card>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.fullName}` : 'Add a trainer'}
        description="Add a coach to your team — you can assign members to them from the member's profile."
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
            <Button type="submit" form="trainer-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add trainer'}
            </Button>
          </>
        }
      >
        <form id="trainer-form" onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full name" name="fullName" required placeholder="e.g. Omar Sheikh" defaultValue={editing?.fullName ?? ''} />
            <Input label="Specialisation" name="specialization" placeholder="e.g. Strength &amp; conditioning" defaultValue={editing?.specialization ?? ''} />
            <Input label="Email" name="email" type="email" defaultValue={editing?.email ?? ''} />
            <Input label="Phone" name="phone" defaultValue={editing?.phone ?? ''} />
            <Input
              label={`Hourly rate (${currency})`}
              name="hourlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={editing?.hourlyRate ?? ''}
            />
          </div>
          <Textarea label="Bio (optional)" name="bio" rows={3} placeholder="Experience, certifications, style…" defaultValue={editing?.bio ?? ''} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            Active — on the roster
          </label>
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </form>
      </Modal>
    </div>
  );
}
