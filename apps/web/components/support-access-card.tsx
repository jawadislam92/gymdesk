'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { SUPPORT_SCOPE_LABELS } from '@gymflow/shared';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Grant {
  id: string;
  scope: 'read_only' | 'full';
  reason: string | null;
  status: string;
  expiresAt: string;
  redeemedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  code?: string;
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'slate' | 'red'> = {
  active: 'green',
  pending: 'amber',
  expired: 'slate',
  revoked: 'red',
};
const DURATIONS = [
  { h: 1, label: '1 hour' },
  { h: 4, label: '4 hours' },
  { h: 24, label: '24 hours' },
  { h: 72, label: '3 days' },
  { h: 168, label: '7 days' },
];

export function SupportAccessCard() {
  const qc = useQueryClient();
  const [minted, setMinted] = useState<Grant | null>(null);
  const [copied, setCopied] = useState(false);

  const grantsQ = useQuery({ queryKey: ['support-grants'], queryFn: () => apiFetch<Grant[]>('/support-access') });

  const mint = useMutation({
    mutationFn: (b: { scope: string; reason?: string; durationHours: number }) =>
      apiFetch<Grant>('/support-access', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: (g) => {
      setMinted(g);
      setCopied(false);
      void qc.invalidateQueries({ queryKey: ['support-grants'] });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiFetch(`/support-access/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['support-grants'] }),
  });

  const copy = async () => {
    if (!minted?.code) return;
    await navigator.clipboard.writeText(minted.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grants = grantsQ.data ?? [];

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck size={18} className="text-orange-600" />
        <h2 className="font-semibold">Support access</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-slate-500">
        Stuck on something? Generate a secure code to let GymFlow support open your account and fix it. You choose how
        much access and for how long — and you can revoke it at any time. Access ends automatically when the timer runs
        out.
      </p>

      {minted?.code && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Your support code — copy it now
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tracking-wide text-slate-900">
              {minted.code}
            </code>
            <Button variant="ghost" onClick={copy} aria-label="Copy support code">
              {copied ? (
                <>
                  <Check size={15} /> Copied
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Share it with GymFlow support. Expires {new Date(minted.expiresAt).toLocaleString()} · it won&apos;t be
            shown again.
          </p>
        </div>
      )}

      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-12"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          mint.mutate({
            scope: String(f.get('scope')),
            reason: String(f.get('reason') || '') || undefined,
            durationHours: Number(f.get('durationHours')),
          });
        }}
      >
        <div className="sm:col-span-5">
          <Select label="Access level" name="scope" defaultValue="full">
            <option value="full">{SUPPORT_SCOPE_LABELS.full}</option>
            <option value="read_only">{SUPPORT_SCOPE_LABELS.read_only}</option>
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Select label="Expires after" name="durationHours" defaultValue="24">
            {DURATIONS.map((d) => (
              <option key={d.h} value={d.h}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-4">
          <Input label="What's the problem? (optional)" name="reason" placeholder="e.g. payments not saving" />
        </div>
        <div className="sm:col-span-12">
          <Button type="submit" disabled={mint.isPending}>
            {mint.isPending ? 'Generating…' : 'Generate support code'}
          </Button>
          {mint.error && <span className="ml-3 text-sm text-red-600">{(mint.error as Error).message}</span>}
        </div>
      </form>

      {grants.length > 0 && (
        <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
          {grants.map((g) => {
            const canRevoke = g.status === 'active' || g.status === 'pending';
            return (
              <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[g.status] ?? 'slate'}>{g.status}</Badge>
                    <span className="text-sm font-medium text-slate-700">
                      {g.scope === 'full' ? 'Full access' : 'Limited access'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {g.reason ? `“${g.reason}” · ` : ''}
                    {g.status === 'expired' || g.status === 'revoked'
                      ? `ended ${new Date(g.expiresAt).toLocaleDateString()}`
                      : `expires ${new Date(g.expiresAt).toLocaleString()}`}
                    {g.lastUsedAt && ` · last used ${new Date(g.lastUsedAt).toLocaleString()}`}
                  </div>
                </div>
                {canRevoke && (
                  <Button
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (confirm('Revoke this support access now? The support team will lose access immediately.'))
                        revoke.mutate(g.id);
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
