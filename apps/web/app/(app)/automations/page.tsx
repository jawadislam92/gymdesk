'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BellRing, Check, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card } from '@/components/ui';

interface Status {
  channels: { inapp: boolean; whatsapp: boolean; sms: boolean; email: boolean };
}
interface Reminder {
  id: string;
  type: string;
  title: string;
  body: string | null;
  channel: string;
  createdAt: string;
  data: { kind?: string; memberName?: string } | null;
}
interface RunResult {
  renewal: number;
  winback: number;
  birthday: number;
  total: number;
}

const kindTone: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  renewal: 'amber',
  winback: 'red',
  birthday: 'green',
};

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState<RunResult | null>(null);

  const statusQ = useQuery({ queryKey: ['automations-status'], queryFn: () => apiFetch<Status>('/automations/status') });
  const logQ = useQuery({ queryKey: ['automations-log'], queryFn: () => apiFetch<Reminder[]>('/automations/log') });

  const run = useMutation({
    mutationFn: () => apiFetch<RunResult>('/automations/run', { method: 'POST' }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['automations-log'] });
    },
  });

  const ch = statusQ.data?.channels;
  const log = logQ.data ?? [];
  const channels = [
    { key: 'inapp', label: 'In-app', on: ch?.inapp },
    { key: 'whatsapp', label: 'WhatsApp', on: ch?.whatsapp },
    { key: 'sms', label: 'SMS', on: ch?.sms },
    { key: 'email', label: 'Email', on: ch?.email },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm text-slate-500">
            Renewal reminders, win-backs &amp; birthday messages — on autopilot, every day.
          </p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? 'Running…' : 'Run now'}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Sent {result.total} reminder{result.total === 1 ? '' : 's'} — {result.renewal} renewal, {result.winback}{' '}
          win-back, {result.birthday} birthday.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {channels.map((c) => (
          <Card key={c.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">{c.label}</div>
              <div className="text-xs text-slate-400">{c.on ? 'Active' : 'Add keys to enable'}</div>
            </div>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                c.on ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {c.on ? <Check size={16} /> : <X size={16} />}
            </span>
          </Card>
        ))}
      </div>

      {ch && !ch.whatsapp && (
        <p className="text-xs text-slate-400">
          💬 WhatsApp / SMS / email reminders activate automatically once you add your provider keys (just like
          Stripe). Until then, every reminder is delivered <strong>in-app</strong> to members and logged below.
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <BellRing size={16} className="text-brand" />
          <h2 className="font-semibold">Recent reminders</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                  No reminders yet. Click “Run now” to generate today’s reminders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
