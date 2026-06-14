'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { ASSIGNABLE_ROLES } from '@gymflow/shared';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Gym {
  id: string;
  slug: string;
  name: string;
  currency: string;
  timezone: string;
  address: string | null;
  city: string | null;
  country: string | null;
}
interface TeamMember {
  id: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  roles: string[];
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [savedGym, setSavedGym] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);

  const gymQ = useQuery({ queryKey: ['gym'], queryFn: () => apiFetch<Gym>('/gym') });
  const teamQ = useQuery({ queryKey: ['team'], queryFn: () => apiFetch<TeamMember[]>('/users') });

  const [gym, setGym] = useState<Gym | null>(null);
  useEffect(() => {
    if (gymQ.data) setGym(gymQ.data);
  }, [gymQ.data]);

  const saveGym = useMutation({
    mutationFn: (body: Partial<Gym>) => apiFetch<Gym>('/gym', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      setSavedGym(true);
      setTimeout(() => setSavedGym(false), 2500);
      void qc.invalidateQueries({ queryKey: ['gym'] });
    },
  });

  const invite = useMutation({
    mutationFn: (body: { email: string; fullName: string; password: string; role: string }) =>
      apiFetch<{ fullName: string }>('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (u) => {
      setInvited(`Invited ${u.fullName}`);
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['team'] }),
  });

  function onSaveGym(e: FormEvent) {
    e.preventDefault();
    if (!gym) return;
    saveGym.mutate({
      name: gym.name,
      currency: gym.currency,
      timezone: gym.timezone,
      address: gym.address ?? undefined,
      city: gym.city ?? undefined,
      country: gym.country ?? undefined,
    });
  }

  function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    invite.mutate({
      email: String(form.get('email')),
      fullName: String(form.get('fullName')),
      password: String(form.get('password')),
      role: String(form.get('role')),
    });
    e.currentTarget.reset();
  }

  const team = teamQ.data ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {gym && (
        <Card>
          <div className="text-sm text-slate-600">
            Your public sign-up page:{' '}
            <a
              href={`/g/${gym.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              /g/{gym.slug}
            </a>{' '}
            — share it to capture leads.
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">Gym profile</h2>
        {gym && (
          <form onSubmit={onSaveGym} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Gym name" value={gym.name} onChange={(e) => setGym({ ...gym, name: e.target.value })} />
            <Input label="Currency" value={gym.currency} maxLength={3} onChange={(e) => setGym({ ...gym, currency: e.target.value.toUpperCase() })} />
            <Input label="Timezone" value={gym.timezone} onChange={(e) => setGym({ ...gym, timezone: e.target.value })} />
            <Input label="City" value={gym.city ?? ''} onChange={(e) => setGym({ ...gym, city: e.target.value })} />
            <Input label="Address" value={gym.address ?? ''} onChange={(e) => setGym({ ...gym, address: e.target.value })} />
            <Input label="Country" value={gym.country ?? ''} onChange={(e) => setGym({ ...gym, country: e.target.value })} />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={saveGym.isPending}>
                {saveGym.isPending ? 'Saving…' : 'Save profile'}
              </Button>
              {savedGym && <span className="text-sm text-green-600">Saved ✓</span>}
              {saveGym.error && <span className="text-sm text-red-600">{(saveGym.error as Error).message}</span>}
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Team</h2>
        {invited && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{invited}</div>}
        <form onSubmit={onInvite} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input label="Full name" name="fullName" required />
          <Input label="Email" name="email" type="email" required />
          <Input label="Temp password" name="password" minLength={8} required />
          <Select label="Role" name="role" defaultValue={ASSIGNABLE_ROLES[0]}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace('gym_', '').replace('_', ' ')}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Inviting…' : 'Invite'}
            </Button>
          </div>
        </form>
        {invite.error && <p className="mb-3 text-sm text-red-600">{(invite.error as Error).message}</p>}

        <ul className="divide-y divide-slate-100">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">
                  {m.fullName} {!m.isActive && <Badge tone="slate">inactive</Badge>}
                </div>
                <div className="text-sm text-slate-500">{m.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {m.roles.map((r) => (
                    <Badge key={r}>{r.replace('gym_', '').replace('_', ' ')}</Badge>
                  ))}
                </div>
                {m.isActive && !m.roles.includes('gym_owner') && (
                  <Button variant="ghost" onClick={() => deactivate.mutate(m.id)}>
                    Deactivate
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
