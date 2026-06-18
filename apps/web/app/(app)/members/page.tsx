'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { dateStamp, downloadCsv } from '@/lib/csv';

interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  gender: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  healthNotes: string | null;
  assignedTrainerId: string | null;
  joinedAt: string | null;
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
interface Trainer {
  id: string;
  fullName: string | null;
}

type MemberBody = {
  fullName: string;
  phone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  healthNotes?: string;
  assignedTrainerId: string | null;
};

const statusTone: Record<string, 'green' | 'red' | 'amber' | 'slate'> = {
  active: 'green',
  expired: 'red',
  frozen: 'amber',
  cancelled: 'slate',
};

const STATUS_FILTERS = ['all', 'active', 'frozen', 'expired', 'cancelled'] as const;

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

export default function MembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [sellFor, setSellFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const membersQuery = useQuery({
    queryKey: ['members', search, statusFilter],
    queryFn: () =>
      apiFetch<Paginated<Member>>(
        `/members?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}${
          statusFilter !== 'all' ? `&status=${statusFilter}` : ''
        }`,
      ),
  });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: () => apiFetch<Plan[]>('/membership-plans') });
  const trainersQuery = useQuery({
    queryKey: ['trainers'],
    queryFn: () => apiFetch<Trainer[]>('/trainers').catch(() => [] as Trainer[]),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['members'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: (body: MemberBody) =>
      editing
        ? apiFetch<Member>(`/members/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : apiFetch<Member>('/members', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (m) => {
      setNotice(editing ? `Updated ${m.fullName}` : `Added ${m.fullName} (${m.memberCode})`);
      setModalOpen(false);
      setEditing(null);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setNotice('Member removed');
      refresh();
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
        body: JSON.stringify({ memberId, membershipId: membership.id, amount: Number(plan.price), method: 'cash' }),
      });
    },
    onSuccess: () => {
      setSellFor(null);
      setNotice('Membership sold and payment recorded ✓');
      refresh();
    },
  });

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(m: Member) {
    setEditing(m);
    setModalOpen(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = String(f.get(k) ?? '').trim();
      return v || undefined;
    };
    save.mutate({
      fullName: String(f.get('fullName') ?? '').trim(),
      phone: str('phone'),
      email: str('email'),
      gender: str('gender'),
      dateOfBirth: str('dateOfBirth'),
      emergencyContact: str('emergencyContact'),
      healthNotes: str('healthNotes'),
      assignedTrainerId: f.get('assignedTrainerId') ? String(f.get('assignedTrainerId')) : null,
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const all: Member[] = [];
      let page = 1;
      for (;;) {
        const res = await apiFetch<Paginated<Member>>(
          `/members?page=${page}&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        );
        all.push(...res.data);
        if (all.length >= res.meta.total || res.data.length === 0) break;
        page += 1;
      }
      downloadCsv(
        `members-${dateStamp()}.csv`,
        all.map((m) => ({
          code: m.memberCode,
          name: m.fullName ?? '',
          phone: m.phone ?? '',
          email: m.email ?? '',
          status: m.status,
          joined: m.joinedAt ? new Date(m.joinedAt).toISOString().slice(0, 10) : '',
        })),
      );
    } finally {
      setExporting(false);
    }
  }

  const members = membersQuery.data?.data ?? [];
  const total = membersQuery.data?.meta.total ?? 0;
  const plans = plansQuery.data ?? [];
  const trainers = trainersQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Members"
        description="Your gym's people. Add and edit full member profiles, sell or renew plans, and keep contact, health, and trainer details in one place."
      >
        <Button variant="ghost" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add member
        </Button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            placeholder="Search name, phone or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? 'bg-brand text-white'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500 sm:ml-auto">
          {total} member{total === 1 ? '' : 's'}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/members/${m.id}`} className="font-semibold text-slate-800 hover:text-brand">
                    {m.fullName}
                  </Link>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">{m.memberCode}</span>
                    {m.email ? ` · ${m.email}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{m.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(m.joinedAt)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[m.status] ?? 'slate'}>{m.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {sellFor === m.id ? (
                      <>
                        <Select id={`plan-${m.id}`} defaultValue={plans[0]?.id} className="!w-40">
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
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => setSellFor(m.id)}>
                          Sell plan
                        </Button>
                        <button
                          onClick={() => openEdit(m)}
                          aria-label="Edit member"
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${m.fullName}? This hides them from the active roster.`)) {
                              remove.mutate(m.id);
                            }
                          }}
                          aria-label="Remove member"
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && !membersQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No members{statusFilter !== 'all' ? ` with status “${statusFilter}”` : ''}{search ? ' match your search' : ' yet'}. Add your first one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.fullName}` : 'Add a new member'}
        description={
          editing ? 'Update this member’s details.' : 'Capture everything you need at sign-up — you can sell them a plan right after.'
        }
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
            <Button type="submit" form="member-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add member'}
            </Button>
          </>
        }
      >
        <form id="member-form" onSubmit={onSubmit} className="space-y-5">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Personal</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" name="fullName" required defaultValue={editing?.fullName ?? ''} />
              <Select label="Gender" name="gender" defaultValue={editing?.gender ?? ''}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
              <Input
                label="Date of birth"
                name="dateOfBirth"
                type="date"
                defaultValue={editing?.dateOfBirth ? editing.dateOfBirth.slice(0, 10) : ''}
              />
              <Input label="Phone" name="phone" defaultValue={editing?.phone ?? ''} />
              <Input label="Email" name="email" type="email" defaultValue={editing?.email ?? ''} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Emergency &amp; health
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Emergency contact"
                name="emergencyContact"
                placeholder="Name &amp; phone"
                defaultValue={editing?.emergencyContact ?? ''}
              />
              <Select label="Assigned trainer" name="assignedTrainerId" defaultValue={editing?.assignedTrainerId ?? ''}>
                <option value="">No trainer</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <Textarea
                  label="Health notes"
                  name="healthNotes"
                  rows={3}
                  placeholder="Injuries, conditions, goals…"
                  defaultValue={editing?.healthNotes ?? ''}
                />
              </div>
            </div>
          </div>

          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </form>
      </Modal>
    </div>
  );
}
