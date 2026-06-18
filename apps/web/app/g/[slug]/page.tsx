'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';
import { AiChat } from './ai-chat';

interface GymPage {
  gym: { name: string; city: string | null; country: string | null; logoUrl: string | null };
  classes: { id: string; title: string; startsAt: string; endsAt: string; trainerName: string | null; capacity: number; bookedCount: number }[];
  plans: { name: string; price: number; durationDays: number }[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PublicGymPage() {
  const slug = String(useParams().slug);
  const [sent, setSent] = useState(false);

  const pageQ = useQuery({
    queryKey: ['public-gym', slug],
    queryFn: () => apiFetch<GymPage>(`/public/gyms/${slug}`, { auth: false }),
  });
  const submit = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/public/gyms/${slug}/leads`, { method: 'POST', auth: false, body: JSON.stringify(body) }),
    onSuccess: () => setSent(true),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    submit.mutate({
      fullName: String(f.get('fullName')),
      email: String(f.get('email') || '') || undefined,
      phone: String(f.get('phone') || '') || undefined,
      message: String(f.get('message') || '') || undefined,
    } as Record<string, string>);
  }

  if (pageQ.isLoading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (pageQ.error) return <div className="p-10 text-center text-slate-500">Gym not found.</div>;
  const data = pageQ.data!;

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-4xl font-extrabold">{data.gym.name}</h1>
          <p className="mt-2 text-slate-600">
            {[data.gym.city, data.gym.country].filter(Boolean).join(', ') || 'Welcome'}
          </p>
          <a href="#join" className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
            Join this gym
          </a>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-8 px-6 py-12 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold">Membership plans</h2>
          <div className="space-y-3">
            {data.plans.map((p) => (
              <Card key={p.name} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-slate-500">{p.durationDays} days</div>
                </div>
                <div className="text-2xl font-bold">${p.price}</div>
              </Card>
            ))}
            {data.plans.length === 0 && <p className="text-sm text-slate-500">Contact us for pricing.</p>}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold">Upcoming classes</h2>
          <Card className="p-0">
            <ul className="divide-y divide-slate-100">
              {data.classes.slice(0, 10).map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-slate-500">
                      {fmt(c.startsAt)}
                      {c.trainerName ? ` · ${c.trainerName}` : ''}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {c.capacity ? `${c.bookedCount}/${c.capacity}` : 'open'}
                  </span>
                </li>
              ))}
              {data.classes.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Schedule coming soon.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <section id="join" className="bg-slate-50 py-12">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="mb-2 text-center text-2xl font-bold">Join {data.gym.name}</h2>
          <p className="mb-6 text-center text-sm text-slate-500">
            Leave your details and the team will reach out to get you started.
          </p>
          {sent ? (
            <Card className="text-center text-green-700">Thanks! The gym will contact you shortly. 🎉</Card>
          ) : (
            <Card>
              <form onSubmit={onSubmit} className="space-y-4">
                <Input label="Your name" name="fullName" required />
                <Input label="Email" name="email" type="email" />
                <Input label="Phone" name="phone" />
                <Input label="Message (optional)" name="message" />
                <Button type="submit" disabled={submit.isPending} className="w-full">
                  {submit.isPending ? 'Sending…' : 'Request to join'}
                </Button>
                {submit.error && <p className="text-sm text-red-600">{(submit.error as Error).message}</p>}
              </form>
            </Card>
          )}
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-slate-500">Powered by GymFlow Suite</footer>

      <AiChat slug={slug} gymName={data.gym.name} />
    </div>
  );
}
