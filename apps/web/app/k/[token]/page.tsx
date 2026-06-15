'use client';

import { useEffect, useState } from 'react';

interface Result {
  valid: boolean;
  memberName: string | null;
  memberCode: string;
  membershipEndsAt: string | null;
}

export default function CheckinPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = window.location.pathname.split('/').filter(Boolean).pop();
    const api = process.env.NEXT_PUBLIC_API_URL ?? '';
    fetch(`${api}/public/checkin/${token}`, { method: 'POST' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Check-in failed');
        setRes(data);
        setState('ok');
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : 'Check-in failed');
        setState('error');
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        {state === 'loading' && <p className="py-8 text-slate-500">Checking you in…</p>}

        {state === 'ok' && res && (
          <>
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                res.valid ? 'bg-green-100' : 'bg-amber-100'
              }`}
            >
              {res.valid ? '✅' : '⚠️'}
            </div>
            <h1 className="text-2xl font-bold">Welcome, {res.memberName ?? 'member'}!</h1>
            <p className="mt-1 text-slate-500">You&apos;re checked in.</p>
            {!res.valid && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Your membership needs renewal — please see the front desk.
              </p>
            )}
            {res.valid && res.membershipEndsAt && (
              <p className="mt-4 text-xs text-slate-400">
                Membership valid until {new Date(res.membershipEndsAt).toLocaleDateString()}
              </p>
            )}
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
              ❌
            </div>
            <h1 className="text-xl font-bold">Check-in failed</h1>
            <p className="mt-1 text-slate-500">{err}</p>
          </>
        )}
      </div>
    </div>
  );
}
