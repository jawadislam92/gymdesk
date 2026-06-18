'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

export default function MemberLayout({ children }: { children: ReactNode }) {
  const { user, loading, isMemberOnly, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!isMemberOnly) router.replace('/');
  }, [loading, user, isMemberOnly, router]);

  if (loading || !user || !isMemberOnly) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-white">G</div>
          <span className="text-lg font-bold">GymFlow</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">{user.fullName}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-800">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
