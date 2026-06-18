'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, LogIn } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth, type SupportRedeem } from '@/lib/auth';
import { Badge, Button, Card } from '@/components/ui';

interface Request {
  id: string;
  scope: 'read_only' | 'full';
  reason: string | null;
  status: string;
  expiresAt: string;
  redeemedAt: string | null;
  gym: { id: string; name: string; slug: string };
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'slate' | 'red'> = {
  active: 'green',
  pending: 'amber',
};

export function SupportAccessPanel() {
  const { enterSupport } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');

  const requestsQ = useQuery({
    queryKey: ['support-requests'],
    queryFn: () => apiFetch<Request[]>('/platform/support-access/requests'),
    refetchInterval: 60_000,
  });

  const redeem = useMutation({
    mutationFn: (c: string) =>
      apiFetch<SupportRedeem>('/platform/support-access/redeem', { method: 'POST', body: JSON.stringify({ code: c }) }),
    onSuccess: (r) => {
      enterSupport(r);
      router.push('/dashboard');
    },
  });

  const requests = requestsQ.data ?? [];

  return (
    <Card className="mb-6">
      <div className="mb-1 flex items-center gap-2">
        <LifeBuoy size={18} className="text-orange-600" />
        <h2 className="font-semibold">Support access</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-slate-500">
        Enter the code a gym shared with you to open a scoped, time-limited session into their account. A banner shows
        the whole time, and access ends automatically when the timer runs out.
      </p>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) redeem.mutate(code.trim());
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SUP-XXXXX-XXXXX-XXXXX"
          aria-label="Support code"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm tracking-wide outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/25 sm:max-w-xs"
        />
        <Button type="submit" disabled={redeem.isPending || !code.trim()}>
          <LogIn size={15} /> {redeem.isPending ? 'Opening…' : 'Open session'}
        </Button>
        {redeem.error && <span className="text-sm text-red-600">{(redeem.error as Error).message}</span>}
      </form>

      {requests.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Open support windows</div>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-700">{r.gym.name}</span>
                    <Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Badge>
                    <span className="text-xs text-slate-500">{r.scope === 'full' ? 'Full' : 'Limited'}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {r.reason ? `“${r.reason}” · ` : ''}expires {new Date(r.expiresAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
