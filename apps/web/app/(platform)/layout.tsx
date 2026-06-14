'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user, loading, isPlatformAdmin, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!isPlatformAdmin) router.replace('/');
  }, [loading, user, isPlatformAdmin, router]);

  if (loading || !user || !isPlatformAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">GymFlow</span>
          <span className="rounded bg-white/15 px-2 py-0.5 text-xs">Platform</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300">{user.fullName}</span>
          <button onClick={logout} className="text-slate-300 hover:text-white">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-8">{children}</main>
    </div>
  );
}
