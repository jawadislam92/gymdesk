'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

interface Lead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: string;
  value: string | number | null;
  followUpAt: string | null;
  convertedMemberId: string | null;
  createdAt: string;
}
interface Activity {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
}
interface LeadDetail extends Lead {
  activities: Activity[];
}
interface Pipeline {
  total: number;
  conversionRate: number;
  followUpsDue: number;
  byStage: Record<string, { count: number; value: number }>;
}

const STAGES = [
  { key: 'new', label: 'New', accent: 'border-t-amber-400' },
  { key: 'contacted', label: 'Contacted', accent: 'border-t-blue-400' },
  { key: 'trial', label: 'Trial', accent: 'border-t-indigo-400' },
  { key: 'negotiation', label: 'Negotiation', accent: 'border-t-violet-400' },
  { key: 'won', label: 'Won', accent: 'border-t-green-500' },
  { key: 'lost', label: 'Lost', accent: 'border-t-red-400' },
];

const SOURCES = ['Walk-in', 'Website', 'Facebook', 'Instagram', 'Referral', 'Google', 'Phone', 'Other'];

const ACTIVITY_ICON: Record<string, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  note: StickyNote,
  stage_change: ArrowRight,
  system: Sparkles,
};

function num(v: string | number | null): number {
  return v == null ? 0 : Number(v);
}
function isOverdue(l: Lead): boolean {
  return !!l.followUpAt && new Date(l.followUpAt) <= new Date() && l.status !== 'won' && l.status !== 'lost';
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const leadsQ = useQuery({ queryKey: ['leads'], queryFn: () => apiFetch<Lead[]>('/leads') });
  const pipeQ = useQuery({ queryKey: ['leads-pipeline'], queryFn: () => apiFetch<Pipeline>('/leads/pipeline') });
  const gymQ = useQuery({ queryKey: ['gym'], queryFn: () => apiFetch<{ currency: string }>('/gym') });
  const currency = gymQ.data?.currency ?? 'USD';

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['leads'] });
    void qc.invalidateQueries({ queryKey: ['leads-pipeline'] });
    if (selectedId) void qc.invalidateQueries({ queryKey: ['lead', selectedId] });
  };

  const addLead = useMutation({
    mutationFn: (b: Record<string, unknown>) => apiFetch('/leads', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => {
      setAddModal(false);
      refresh();
    },
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addLead.mutate({
      fullName: String(f.get('fullName') ?? '').trim(),
      phone: String(f.get('phone') ?? '').trim() || undefined,
      email: String(f.get('email') ?? '').trim() || undefined,
      source: String(f.get('source') ?? '').trim() || undefined,
      value: f.get('value') ? Number(f.get('value')) : undefined,
      message: String(f.get('message') ?? '').trim() || undefined,
    });
  }

  const leads = leadsQ.data ?? [];
  const pipe = pipeQ.data;
  const openValue = pipe
    ? ['new', 'contacted', 'trial', 'negotiation'].reduce((s, k) => s + (pipe.byStage[k]?.value ?? 0), 0)
    : 0;

  const KPIS = [
    { label: 'Total leads', value: pipe ? pipe.total.toLocaleString() : '—', tone: 'text-slate-900' },
    { label: 'Conversion rate', value: pipe ? `${pipe.conversionRate}%` : '—', tone: 'text-green-600' },
    {
      label: 'Follow-ups due',
      value: pipe ? pipe.followUpsDue.toLocaleString() : '—',
      tone: pipe && pipe.followUpsDue > 0 ? 'text-red-600' : 'text-slate-900',
    },
    { label: 'Open pipeline value', value: pipe ? `${currency} ${openValue.toLocaleString()}` : '—', tone: 'text-slate-900' },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Your sales pipeline. Capture every enquiry, work it through the stages, log calls and follow-ups, and convert won leads into members."
      >
        <Button onClick={() => setAddModal(true)}>
          <Plus size={16} /> Add lead
        </Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <div className="text-sm font-medium text-slate-500">{k.label}</div>
            <div className={`mt-1 text-2xl font-bold tracking-tight ${k.tone}`}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          const stat = pipe?.byStage[stage.key];
          return (
            <div key={stage.key} className="w-64 shrink-0">
              <div className={`rounded-t-xl border-x border-t-4 border-slate-200 bg-white px-3 py-2 ${stage.accent}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-500">
                    {stageLeads.length}
                  </span>
                </div>
                {stat && stat.value > 0 && (
                  <div className="text-xs text-slate-400">
                    {currency} {stat.value.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="space-y-2 rounded-b-xl border-x border-b border-slate-200 bg-slate-50 p-2">
                {stageLeads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand hover:shadow"
                  >
                    <div className="font-semibold text-slate-800">{l.fullName}</div>
                    <div className="truncate text-xs text-slate-500">{l.phone ?? l.email ?? 'No contact'}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {num(l.value) > 0 ? (
                        <span className="text-xs font-semibold text-slate-600">
                          {currency} {num(l.value).toLocaleString()}
                        </span>
                      ) : (
                        <span />
                      )}
                      {isOverdue(l) && (
                        <Badge tone="red">
                          <Clock size={11} /> follow up
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
                {stageLeads.length === 0 && <div className="px-2 py-4 text-center text-xs text-slate-300">—</div>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add a lead"
        description="Capture a new enquiry. You can work it through the pipeline and convert it later."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="lead-form" disabled={addLead.isPending}>
              {addLead.isPending ? 'Saving…' : 'Add lead'}
            </Button>
          </>
        }
      >
        <form id="lead-form" onSubmit={onAdd} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full name" name="fullName" required placeholder="e.g. Sara Khan" />
            <Input label="Phone" name="phone" placeholder="WhatsApp / mobile" />
            <Input label="Email" name="email" type="email" />
            <Select label="Source" name="source" defaultValue="">
              <option value="">How did they hear about you?</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input label={`Estimated value (${currency})`} name="value" type="number" min={0} step="0.01" />
          </div>
          <Textarea label="Note" name="message" rows={3} placeholder="What are they interested in?" />
          {addLead.error && <p className="text-sm text-red-600">{(addLead.error as Error).message}</p>}
        </form>
      </Modal>

      {selectedId && <LeadPanel id={selectedId} currency={currency} onClose={() => setSelectedId(null)} onChanged={refresh} />}
    </div>
  );
}

function LeadPanel({
  id,
  currency,
  onClose,
  onChanged,
}: {
  id: string;
  currency: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const leadQ = useQuery({ queryKey: ['lead', id], queryFn: () => apiFetch<LeadDetail>(`/leads/${id}`) });
  const lead = leadQ.data;

  const afterChange = () => {
    void qc.invalidateQueries({ queryKey: ['lead', id] });
    onChanged();
  };

  const patch = useMutation({
    mutationFn: (b: Record<string, unknown>) => apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
    onSuccess: afterChange,
  });
  const addActivity = useMutation({
    mutationFn: (b: { type: string; body: string }) =>
      apiFetch(`/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: afterChange,
  });
  const convert = useMutation({
    mutationFn: () => apiFetch<{ memberCode: string }>(`/leads/${id}/convert`, { method: 'POST' }),
    onSuccess: afterChange,
  });

  function onLogActivity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = String(f.get('body') || '').trim();
    if (!body) return;
    addActivity.mutate({ type: String(f.get('type')), body });
    e.currentTarget.reset();
  }

  const statusTone =
    lead?.status === 'won' ? 'green' : lead?.status === 'lost' ? 'red' : lead?.status === 'new' ? 'amber' : 'blue';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{lead?.fullName ?? 'Lead'}</h2>
            {lead && (
              <Badge tone={statusTone as 'green' | 'red' | 'amber' | 'blue'}>
                {STAGES.find((s) => s.key === lead.status)?.label ?? lead.status}
              </Badge>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {!lead ? (
          <div className="p-6 text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="space-y-5 p-5">
            {/* Contact */}
            <div className="space-y-2 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={15} className="text-slate-400" /> {lead.phone}
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={15} className="text-slate-400" /> {lead.email}
                </div>
              )}
              {lead.source && (
                <div className="text-xs text-slate-400">
                  Source: <span className="font-medium text-slate-500">{lead.source}</span>
                </div>
              )}
              {lead.message && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-500">“{lead.message}”</p>
              )}
            </div>

            {lead.convertedMemberId ? (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                ✓ Converted to a member.{' '}
                <Link href={`/members/${lead.convertedMemberId}`} className="font-semibold underline">
                  Open profile
                </Link>
              </div>
            ) : (
              <button
                disabled={convert.isPending}
                onClick={() => convert.mutate()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[.99] disabled:opacity-50"
              >
                <Star size={16} /> {convert.isPending ? 'Converting…' : 'Convert to member'}
              </button>
            )}
            {convert.error && <p className="text-sm text-red-600">{(convert.error as Error).message}</p>}

            {/* Stage + follow-up + value */}
            <div className="grid grid-cols-2 gap-3">
              <Select label="Stage" value={lead.status} onChange={(e) => patch.mutate({ status: e.target.value })}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">Follow-up</span>
                <input
                  type="date"
                  defaultValue={lead.followUpAt ? lead.followUpAt.slice(0, 10) : ''}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                  onChange={(e) => patch.mutate({ followUpAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">Estimated value ({currency})</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={num(lead.value) || ''}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                  onBlur={(e) => patch.mutate({ value: e.target.value ? Number(e.target.value) : null })}
                />
              </label>
            </div>

            {/* Log activity */}
            <form onSubmit={onLogActivity} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <select name="type" defaultValue="note" className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand">
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
                <input
                  name="body"
                  placeholder="Log a call, note, or message…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>
              <Button type="submit" variant="ghost" disabled={addActivity.isPending}>
                {addActivity.isPending ? 'Saving…' : 'Log activity'}
              </Button>
            </form>

            {/* Timeline */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Activity</h3>
              <ul className="space-y-3">
                {lead.activities.map((a) => {
                  const Icon = ACTIVITY_ICON[a.type] ?? StickyNote;
                  return (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="text-slate-700">{a.body ?? a.type}</div>
                        <div className="text-xs text-slate-400">
                          {a.type !== 'note' && <span className="capitalize">{a.type.replace('_', ' ')} · </span>}
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {lead.activities.length === 0 && <li className="text-xs text-slate-400">No activity yet.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
