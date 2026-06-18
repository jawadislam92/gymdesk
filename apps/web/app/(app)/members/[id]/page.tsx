'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  joinedAt: string;
  healthNotes: string | null;
  assignedTrainerId: string | null;
}
interface TrainerOption {
  id: string;
  fullName: string | null;
}
interface WPExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
}
interface WPlan {
  id: string;
  title: string;
  goal: string | null;
  exercises: WPExercise[];
}
interface PRecord {
  id: string;
  recordedAt: string;
  weight: number | null;
  notes: string | null;
}
interface DietPlan {
  id: string;
  title: string;
  targetCalories: number | null;
  macros: { protein?: number; carbs?: number; fat?: number } | null;
  meals: { name: string; items?: string }[] | null;
}
interface Membership {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  pricePaid: string | number;
  plan?: { name: string; durationDays: number } | null;
}
interface Payment {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  method: string;
  paidAt: string | null;
}
interface Attendance {
  id: string;
  checkedInAt: string;
}
interface Paginated<T> {
  data: T[];
}

const statusTone: Record<string, 'green' | 'red' | 'amber' | 'slate'> = {
  active: 'green',
  expired: 'red',
  frozen: 'amber',
  cancelled: 'slate',
};

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  const memberQ = useQuery({ queryKey: ['member', id], queryFn: () => apiFetch<Member>(`/members/${id}`) });
  const mshipsQ = useQuery({
    queryKey: ['memberships', id],
    queryFn: () => apiFetch<Membership[]>(`/memberships?memberId=${id}`),
  });
  const paymentsQ = useQuery({
    queryKey: ['member-payments', id],
    queryFn: () => apiFetch<Paginated<Payment>>(`/payments?memberId=${id}&pageSize=20`),
  });
  const attendanceQ = useQuery({
    queryKey: ['member-attendance', id],
    queryFn: () => apiFetch<Attendance[]>(`/attendance?memberId=${id}`),
  });

  const action = useMutation({
    mutationFn: ({ mid, what }: { mid: string; what: 'renew' | 'freeze' | 'cancel' }) =>
      apiFetch(`/memberships/${mid}/${what}`, {
        method: 'POST',
        body: what === 'renew' ? JSON.stringify({}) : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['memberships', id] });
      void qc.invalidateQueries({ queryKey: ['member', id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const trainersQ = useQuery({
    queryKey: ['trainers'],
    queryFn: () => apiFetch<TrainerOption[]>('/trainers'),
  });
  const assignTrainer = useMutation({
    mutationFn: (trainerId: string | null) =>
      apiFetch(`/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTrainerId: trainerId }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const grantLogin = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch(`/members/${id}/grant-login`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => setLoginMsg('Login created — the member can now sign in to the portal.'),
    onError: (e) => setLoginMsg((e as Error).message),
  });

  const workoutsQ = useQuery({ queryKey: ['workouts', id], queryFn: () => apiFetch<WPlan[]>(`/workout-plans?memberId=${id}`) });
  const progressStaffQ = useQuery({ queryKey: ['progress', id], queryFn: () => apiFetch<PRecord[]>(`/progress?memberId=${id}`) });
  const createWorkout = useMutation({
    mutationFn: (body: { title: string; goal?: string }) =>
      apiFetch('/workout-plans', { method: 'POST', body: JSON.stringify({ ...body, memberId: id }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workouts', id] }),
  });
  const addExercise = useMutation({
    mutationFn: (v: { planId: string; name: string; sets?: number; reps?: number }) =>
      apiFetch(`/workout-plans/${v.planId}/exercises`, {
        method: 'POST',
        body: JSON.stringify({ name: v.name, sets: v.sets, reps: v.reps }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['workouts', id] }),
  });
  const recordProgress = useMutation({
    mutationFn: (body: { weight?: number; notes?: string }) =>
      apiFetch('/progress', { method: 'POST', body: JSON.stringify({ ...body, memberId: id }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['progress', id] }),
  });
  const dietQ = useQuery({ queryKey: ['diet', id], queryFn: () => apiFetch<DietPlan[]>(`/diet-plans?memberId=${id}`) });
  const createDiet = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/diet-plans', { method: 'POST', body: JSON.stringify({ ...body, memberId: id }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['diet', id] }),
  });

  const member = memberQ.data;
  const memberships = mshipsQ.data ?? [];
  const current = memberships.find((m) => m.status === 'active') ?? memberships[0];
  const payments = paymentsQ.data?.data ?? [];
  const attendance = attendanceQ.data ?? [];

  return (
    <div className="space-y-6">
      <Link href="/members" className="text-sm text-brand hover:underline">
        ← Back to members
      </Link>

      {member && (
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{member.fullName}</h1>
            <Badge tone={statusTone[member.status] ?? 'slate'}>{member.status}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {member.memberCode} · joined {fmt(member.joinedAt)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd>{member?.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd>{member?.email ?? '—'}</dd>
            </div>
            {member?.healthNotes && (
              <div>
                <dt className="text-slate-500">Health notes</dt>
                <dd className="mt-1">{member.healthNotes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Current membership</h2>
          {current ? (
            <div className="text-sm">
              <div className="text-lg font-semibold">{current.plan?.name ?? 'Plan'}</div>
              <div className="text-slate-500">
                {fmt(current.startDate)} → {fmt(current.endDate)} ·{' '}
                <Badge tone={statusTone[current.status] ?? 'slate'}>{current.status}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={action.isPending}
                  onClick={() => action.mutate({ mid: current.id, what: 'renew' })}
                >
                  Renew
                </Button>
                <Button
                  variant="ghost"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ mid: current.id, what: 'freeze' })}
                >
                  Freeze
                </Button>
                <Button
                  variant="danger"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ mid: current.id, what: 'cancel' })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No membership yet — sell a plan from the Members list.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Assigned trainer</h2>
        <div className="max-w-xs">
          <Select
            value={member?.assignedTrainerId ?? ''}
            onChange={(e) => assignTrainer.mutate(e.target.value || null)}
          >
            <option value="">— None —</option>
            {(trainersQ.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Training</h2>
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            createWorkout.mutate({ title: String(f.get('title')), goal: String(f.get('goal') || '') || undefined });
            e.currentTarget.reset();
          }}
        >
          <Input label="New workout plan" name="title" placeholder="e.g. Strength A" required />
          <Input label="Goal" name="goal" />
          <Button type="submit" disabled={createWorkout.isPending}>
            Add plan
          </Button>
        </form>

        <div className="space-y-3">
          {(workoutsQ.data ?? []).map((plan) => (
            <div key={plan.id} className="rounded-lg border border-slate-200 p-3">
              <div className="font-medium">
                {plan.title}
                {plan.goal ? ` — ${plan.goal}` : ''}
              </div>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {plan.exercises.map((ex) => (
                  <li key={ex.id} className="flex justify-between py-1">
                    <span>{ex.name}</span>
                    <span className="text-slate-500">
                      {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  addExercise.mutate({
                    planId: plan.id,
                    name: String(f.get('name')),
                    sets: Number(f.get('sets')) || undefined,
                    reps: Number(f.get('reps')) || undefined,
                  });
                  e.currentTarget.reset();
                }}
              >
                <input name="name" placeholder="Exercise" required className="rounded border border-slate-300 px-2 py-1 text-sm" />
                <input name="sets" type="number" min={0} placeholder="sets" className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                <input name="reps" type="number" min={0} placeholder="reps" className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                <Button variant="ghost" type="submit">
                  + exercise
                </Button>
              </form>
            </div>
          ))}
          {(workoutsQ.data ?? []).length === 0 && <p className="text-sm text-slate-500">No workout plans yet.</p>}
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-600">Progress</h3>
        <form
          className="mb-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const w = Number(f.get('weight'));
            recordProgress.mutate({ weight: w > 0 ? w : undefined, notes: String(f.get('notes') || '') || undefined });
            e.currentTarget.reset();
          }}
        >
          <Input label="Weight (kg)" name="weight" type="number" step="0.1" min={0} />
          <Input label="Note" name="notes" />
          <Button type="submit" disabled={recordProgress.isPending}>
            Record
          </Button>
        </form>
        <ul className="divide-y divide-slate-100 text-sm">
          {(progressStaffQ.data ?? []).slice(0, 8).map((p) => (
            <li key={p.id} className="flex justify-between py-1">
              <span className="text-slate-500">{new Date(p.recordedAt).toLocaleDateString()}</span>
              <span>
                {p.weight != null ? `${p.weight} kg` : ''}
                {p.notes ? ` · ${p.notes}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Nutrition</h2>
        <form
          className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const meals = String(f.get('meals') || '')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => {
                const i = l.indexOf(':');
                return i >= 0 ? { name: l.slice(0, i).trim(), items: l.slice(i + 1).trim() } : { name: l };
              });
            const protein = Number(f.get('protein')) || undefined;
            const carbs = Number(f.get('carbs')) || undefined;
            const fat = Number(f.get('fat')) || undefined;
            createDiet.mutate({
              title: String(f.get('title')),
              targetCalories: Number(f.get('calories')) || undefined,
              macros: protein || carbs || fat ? { protein, carbs, fat } : undefined,
              meals: meals.length ? meals : undefined,
            });
            e.currentTarget.reset();
          }}
        >
          <div className="col-span-2 sm:col-span-4">
            <Input label="Diet plan title" name="title" placeholder="e.g. Cutting plan" required />
          </div>
          <Input label="Calories" name="calories" type="number" min={0} />
          <Input label="Protein (g)" name="protein" type="number" min={0} />
          <Input label="Carbs (g)" name="carbs" type="number" min={0} />
          <Input label="Fat (g)" name="fat" type="number" min={0} />
          <label className="col-span-2 block text-sm sm:col-span-4">
            <span className="mb-1 block font-medium text-slate-600">Meals (one per line — &quot;Name: items&quot;)</span>
            <textarea
              name="meals"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={'Breakfast: oats, eggs\nLunch: chicken, rice'}
            />
          </label>
          <div className="col-span-2 sm:col-span-4">
            <Button type="submit" disabled={createDiet.isPending}>
              Save diet plan
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          {(dietQ.data ?? []).map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-medium">{d.title}</div>
              <div className="text-slate-500">
                {d.targetCalories ? `${d.targetCalories} kcal` : ''}
                {d.macros ? ` · P${d.macros.protein ?? 0}/C${d.macros.carbs ?? 0}/F${d.macros.fat ?? 0}` : ''}
              </div>
              {d.meals && d.meals.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-slate-600">
                  {d.meals.map((m, i) => (
                    <li key={i}>
                      {m.name}
                      {m.items ? `: ${m.items}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {(dietQ.data ?? []).length === 0 && <p className="text-sm text-slate-500">No diet plans yet.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Member app login</h2>
        <form
          key={member?.id ?? 'loading'}
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            grantLogin.mutate({ email: String(f.get('email')), password: String(f.get('password')) });
          }}
        >
          <Input label="Email" name="email" type="email" defaultValue={member?.email ?? ''} required />
          <Input label="Temp password" name="password" minLength={8} required />
          <Button type="submit" disabled={grantLogin.isPending}>
            {grantLogin.isPending ? 'Saving…' : 'Create login'}
          </Button>
        </form>
        {loginMsg && <p className="mt-2 text-sm text-slate-600">{loginMsg}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Payments</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span className="font-mono text-xs text-slate-500">{p.invoiceNumber}</span>
              <span className="capitalize text-slate-500">{p.method}</span>
              <span>{fmt(p.paidAt)}</span>
              <span className="font-medium">${p.amount}</span>
            </li>
          ))}
          {payments.length === 0 && <li className="py-2 text-slate-500">No payments yet.</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Attendance ({attendance.length})</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {attendance.slice(0, 15).map((a) => (
            <li key={a.id} className="py-2 text-slate-600">
              {new Date(a.checkedInAt).toLocaleString()}
            </li>
          ))}
          {attendance.length === 0 && <li className="py-2 text-slate-500">No check-ins yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
