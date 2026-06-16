'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { BellRing, Check, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

interface Status {
  channels: { inapp: boolean; whatsapp: boolean; sms: boolean; email: boolean };
}
interface Automation {
  id: string;
  name: string;
  trigger: string;
  timingDays: number;
  channel: string;
  title: string;
  template: string;
  enabled: boolean;
}
interface Reminder {
  id: string;
  type: string;
  title: string;
  channel: string;
  createdAt: string;
  data: { kind?: string; memberName?: string } | null;
}
interface RunResult {
  ran: number;
  sent: number;
}

const TRIGGERS: Record<string, { label: string; desc: (d: number) => string; timing?: string }> = {
  membership_expiring: {
    label: 'Membership expiring',
    desc: (d) => `When a member's plan expires within ${d} day${d === 1 ? '' : 's'}`,
    timing: 'Days before expiry',
  },
  member_inactive: {
    label: 'Member inactive',
    desc: (d) => `When a member hasn't checked in for ${d} day${d === 1 ? '' : 's'}`,
    timing: 'Days inactive',
  },
  birthday: { label: "Member's birthday", desc: () => "On a member's birthday" },
  welcome: {
    label: 'New member welcome',
    desc: (d) => `When a member joins (within ${d} day${d === 1 ? '' : 's'})`,
    timing: 'Within days of joining',
  },
};
const CHANNELS: Record<string, string> = { in_app: 'In-app', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };
const kindTone: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  renewal: 'amber',
  winback: 'red',
  birthday: 'green',
  welcome: 'blue',
};

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState<RunResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [formTrigger, setFormTrigger] = useState('membership_expiring');

  const statusQ = useQuery({ queryKey: ['automations-status'], queryFn: () => apiFetch<Status>('/automations/status') });
  const rulesQ = useQuery({ queryKey: ['automations'], queryFn: () => apiFetch<Automation[]>('/automations') });
  const logQ = useQuery({ queryKey: ['automations-log'], queryFn: () => apiFetch<Reminder[]>('/automations/log') });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['automations'] });
    void qc.invalidateQueries({ queryKey: ['automations-log'] });
  };

  const run = useMutation({
    mutationFn: () => apiFetch<RunResult>('/automations/run', { method: 'POST' }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['automations-log'] });
    },
  });
  const save = useMutation({
    mutationFn: (b: Record<string, unknown>) =>
      editing
        ? apiFetch(`/automations/${editing.id}`, { method: 'PATCH', body: JSON.stringify(b) })
        : apiFetch('/automations', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) =>
      apiFetch(`/automations/${v.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: v.enabled }) }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/automations/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  function openAdd() {
    setEditing(null);
    setFormTrigger('membership_expiring');
    setModalOpen(true);
  }
  function openEdit(a: Automation) {
    setEditing(a);
    setFormTrigger(a.trigger);
    setModalOpen(true);
  }
  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save.mutate({
      name: String(f.get('name') ?? '').trim(),
      trigger: formTrigger,
      timingDays: Number(f.get('timingDays') || 0),
      channel: String(f.get('channel') ?? 'in_app'),
      title: String(f.get('title') ?? '').trim(),
      template: String(f.get('template') ?? '').trim(),
      enabled: f.get('enabled') === 'on',
    });
  }

  const ch = statusQ.data?.channels;
  const rules = rulesQ.data ?? [];
  const log = logQ.data ?? [];
  const channels = [
    { key: 'inapp', label: 'In-app', on: ch?.inapp },
    { key: 'whatsapp', label: 'WhatsApp', on: ch?.whatsapp },
    { key: 'sms', label: 'SMS', on: ch?.sms },
    { key: 'email', label: 'Email', on: ch?.email },
  ];
  const triggerMeta = TRIGGERS[formTrigger];

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Create your own rules — pick a trigger, write the message, choose a channel, switch it on. The engine runs every enabled rule daily, on autopilot."
      >
        <Button variant="ghost" onClick={() => run.mutate()} disabled={run.isPending}>
          <Play size={15} /> {run.isPending ? 'Running…' : 'Run now'}
        </Button>
        <Button onClick={openAdd}>
          <Plus size={16} /> New automation
        </Button>
      </PageHeader>

      {result && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Ran {result.ran} automation{result.ran === 1 ? '' : 's'} — sent {result.sent} message
          {result.sent === 1 ? '' : 's'}.
        </div>
      )}

      {/* Rules */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rules.map((a) => (
          <Card key={a.id} className={a.enabled ? '' : 'opacity-70'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{a.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {(TRIGGERS[a.trigger]?.desc ?? (() => a.trigger))(a.timingDays)}
                </div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })}
                aria-label="Toggle automation"
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${a.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${a.enabled ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">“{a.title}”</p>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
              <Badge tone="slate">{CHANNELS[a.channel] ?? a.channel}</Badge>
              <span className="flex-1" />
              <Button variant="ghost" onClick={() => openEdit(a)}>
                <Pencil size={15} /> Edit
              </Button>
              <button
                onClick={() => {
                  if (confirm(`Delete “${a.name}”?`)) remove.mutate(a.id);
                }}
                aria-label="Delete automation"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
        {rules.length === 0 && !rulesQ.isLoading && (
          <Card className="lg:col-span-2">
            <p className="py-6 text-center text-slate-400">No automations yet — create your first rule.</p>
          </Card>
        )}
      </div>

      {/* Channel status */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Delivery channels</h2>
      <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {channels.map((c) => (
          <Card key={c.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">{c.label}</div>
              <div className="text-xs text-slate-400">{c.on ? 'Active' : 'Add keys to enable'}</div>
            </div>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${c.on ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
            >
              {c.on ? <Check size={16} /> : <X size={16} />}
            </span>
          </Card>
        ))}
      </div>
      {ch && !ch.whatsapp && (
        <p className="mb-8 text-xs text-slate-400">
          WhatsApp / SMS / email activate automatically once you add provider keys (like Stripe). Until then every
          message is delivered <strong>in-app</strong> and logged below.
        </p>
      )}

      {/* Log */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <BellRing size={16} className="text-brand" />
          <h2 className="font-semibold">Recent messages</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {log.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.data?.memberName ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={kindTone[r.data?.kind ?? ''] ?? 'slate'}>{r.data?.kind ?? r.type}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.title}</td>
                <td className="px-4 py-3 text-xs uppercase text-slate-400">{r.channel.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {log.length === 0 && !logQ.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No messages yet. Click “Run now” to fire today’s automations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Builder modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit “${editing.name}”` : 'New automation'}
        description="Pick what triggers it, write the message members get, and choose how it's sent."
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
            <Button type="submit" form="auto-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create automation'}
            </Button>
          </>
        }
      >
        <form id="auto-form" onSubmit={onSave} className="space-y-4">
          <Input label="Name" name="name" required placeholder="e.g. 3-day renewal nudge" defaultValue={editing?.name ?? ''} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Trigger" name="trigger" value={formTrigger} onChange={(e) => setFormTrigger(e.target.value)}>
              {Object.entries(TRIGGERS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            {triggerMeta?.timing && (
              <Input
                label={triggerMeta.timing}
                name="timingDays"
                type="number"
                min={0}
                defaultValue={editing?.timingDays ?? 7}
              />
            )}
            <Select label="Channel" name="channel" defaultValue={editing?.channel ?? 'in_app'}>
              {Object.entries(CHANNELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Message title"
            name="title"
            required
            placeholder="e.g. Your membership is expiring soon"
            defaultValue={editing?.title ?? ''}
          />
          <Textarea
            label="Message"
            name="template"
            rows={4}
            required
            placeholder="Hi {firstName}, your {planName} membership ends in {days} days…"
            defaultValue={editing?.template ?? ''}
          />
          <p className="text-xs text-slate-400">
            Variables you can use:{' '}
            <code className="rounded bg-slate-100 px-1">{'{firstName}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{planName}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{days}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{gymName}'}</code>
          </p>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={editing ? editing.enabled : true}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            Active — run this automation daily
          </label>
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </form>
      </Modal>
    </div>
  );
}
