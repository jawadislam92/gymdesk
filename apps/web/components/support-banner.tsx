'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function remaining(toISO: string): string {
  const ms = new Date(toISO).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * High-visibility bar shown on every staff screen while an operator is inside a
 * consented support session. Counts down to expiry and auto-exits when the
 * scoped token runs out, so access is never silently open.
 */
export function SupportBanner() {
  const { support, exitSupport } = useAuth();
  const router = useRouter();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!support) return;
    const id = setInterval(() => {
      if (new Date(support.expiresAt).getTime() <= Date.now()) {
        clearInterval(id);
        void exitSupport().then(() => router.push('/platform'));
      } else {
        tick((n) => n + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [support, exitSupport, router]);

  if (!support) return null;

  const exit = () => void exitSupport().then(() => router.push('/platform'));

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <div className="flex min-w-0 items-center gap-2">
        <LifeBuoy size={16} className="shrink-0 text-amber-700" />
        <span className="truncate">
          <strong>Support session</strong> · {support.gymName} ·{' '}
          {support.scope === 'full' ? 'Full access' : 'Limited access'} · expires in{' '}
          <span className="font-mono tabular-nums">{remaining(support.expiresAt)}</span>
        </span>
      </div>
      <button
        onClick={exit}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-700"
      >
        <X size={14} /> Exit support
      </button>
    </div>
  );
}
