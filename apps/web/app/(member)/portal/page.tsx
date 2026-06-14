'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input } from '@/components/ui';

interface Summary {
  member: { memberCode: string; fullName: string | null; status: string };
  membership: { plan: string | null; status: string; endDate: string; daysRemaining: number | null } | null;
}
interface Booking {
  bookingId: string;
  classId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
}
interface ClassItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  isCancelled: boolean;
  trainerName: string | null;
}
interface Payment {
  id: string;
  invoiceNumber: string | null;
  amount: number;
  method: string;
  paidAt: string | null;
}
interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
}
interface WorkoutPlan {
  id: string;
  title: string;
  goal: string | null;
  exercises: Exercise[];
}
interface ProgressRecord {
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
interface Announcement {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
}
interface MyWaiver {
  waiver: { id: string; title: string; body: string; version: number } | null;
  accepted: boolean;
  acceptedAt: string | null;
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

export default function PortalPage() {
  const qc = useQueryClient();
  const summaryQ = useQuery({ queryKey: ['me-summary'], queryFn: () => apiFetch<Summary>('/me/summary') });
  const bookingsQ = useQuery({ queryKey: ['me-bookings'], queryFn: () => apiFetch<Booking[]>('/me/bookings') });
  const classesQ = useQuery({ queryKey: ['me-classes'], queryFn: () => apiFetch<ClassItem[]>('/me/classes') });
  const paymentsQ = useQuery({ queryKey: ['me-payments'], queryFn: () => apiFetch<Payment[]>('/me/payments') });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['me-bookings'] });
    void qc.invalidateQueries({ queryKey: ['me-classes'] });
  };
  const book = useMutation({
    mutationFn: (classId: string) => apiFetch(`/me/classes/${classId}/book`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (bookingId: string) => apiFetch(`/me/bookings/${bookingId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const workoutsQ = useQuery({ queryKey: ['me-workouts'], queryFn: () => apiFetch<WorkoutPlan[]>('/me/workouts') });
  const progressQ = useQuery({ queryKey: ['me-progress'], queryFn: () => apiFetch<ProgressRecord[]>('/me/progress') });
  const dietQ = useQuery({ queryKey: ['me-diet'], queryFn: () => apiFetch<DietPlan[]>('/me/diet') });
  const notificationsQ = useQuery({ queryKey: ['me-notifications'], queryFn: () => apiFetch<Announcement[]>('/me/notifications') });
  const waiverQ = useQuery({ queryKey: ['me-waiver'], queryFn: () => apiFetch<MyWaiver>('/me/waiver') });
  const acceptWaiver = useMutation({
    mutationFn: () => apiFetch('/me/waiver/accept', { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me-waiver'] }),
  });
  const logProgress = useMutation({
    mutationFn: (body: { weight?: number; notes?: string }) =>
      apiFetch('/me/progress', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me-progress'] }),
  });

  const s = summaryQ.data;
  const bookings = bookingsQ.data ?? [];
  const bookedIds = new Set(bookings.map((b) => b.classId));
  const available = (classesQ.data ?? []).filter((c) => !c.isCancelled && !bookedIds.has(c.id));
  const payments = paymentsQ.data ?? [];

  const dr = s?.membership?.daysRemaining ?? null;
  const tone = dr === null ? 'slate' : dr <= 0 ? 'red' : dr <= 7 ? 'amber' : 'green';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hi {s?.member.fullName ?? 'there'} 👋</h1>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Your membership</h2>
        {s?.membership ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{s.membership.plan}</span>
              <Badge tone={tone}>{s.membership.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {dr !== null && dr > 0
                ? `${dr} day${dr === 1 ? '' : 's'} remaining · ends ${new Date(s.membership.endDate).toLocaleDateString()}`
                : `Expired on ${new Date(s.membership.endDate).toLocaleDateString()}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No active membership — talk to the front desk to get started.</p>
        )}
      </Card>

      {waiverQ.data?.waiver && !waiverQ.data.accepted && (
        <Card className="border-amber-300 bg-amber-50">
          <h2 className="font-semibold text-amber-800">{waiverQ.data.waiver.title}</h2>
          <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-600">
            {waiverQ.data.waiver.body}
          </p>
          <Button className="mt-3" disabled={acceptWaiver.isPending} onClick={() => acceptWaiver.mutate()}>
            {acceptWaiver.isPending ? 'Saving…' : 'I accept'}
          </Button>
        </Card>
      )}

      {(notificationsQ.data ?? []).length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Announcements</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {(notificationsQ.data ?? []).slice(0, 5).map((n) => (
              <li key={n.id} className="py-2">
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-slate-500">{n.body}</div>}
                <div className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">My upcoming classes</h2>
        <ul className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <li key={b.bookingId} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.title}</div>
                <div className="text-sm text-slate-500">
                  {fmt(b.startsAt)}
                  {b.location ? ` · ${b.location}` : ''}
                </div>
              </div>
              <Button variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(b.bookingId)}>
                Cancel
              </Button>
            </li>
          ))}
          {bookings.length === 0 && <li className="py-3 text-sm text-slate-400">You haven&apos;t booked any classes yet.</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Book a class</h2>
        <ul className="divide-y divide-slate-100">
          {available.map((c) => {
            const full = c.capacity > 0 && c.bookedCount >= c.capacity;
            return (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-sm text-slate-500">
                    {fmt(c.startsAt)}
                    {c.trainerName ? ` · ${c.trainerName}` : ''}
                  </div>
                </div>
                <Button disabled={book.isPending || full} onClick={() => book.mutate(c.id)}>
                  {full ? 'Full' : 'Book'}
                </Button>
              </li>
            );
          })}
          {available.length === 0 && <li className="py-3 text-sm text-slate-400">No classes available to book right now.</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">My workout</h2>
        {workoutsQ.data?.[0] ? (
          <div>
            <div className="font-medium">{workoutsQ.data[0].title}</div>
            {workoutsQ.data[0].goal && <div className="text-sm text-slate-500">{workoutsQ.data[0].goal}</div>}
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {workoutsQ.data[0].exercises.map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  <span>{e.name}</span>
                  <span className="text-slate-500">
                    {[e.sets && `${e.sets} sets`, e.reps && `${e.reps} reps`].filter(Boolean).join(' · ') || '—'}
                  </span>
                </li>
              ))}
              {workoutsQ.data[0].exercises.length === 0 && <li className="py-2 text-slate-400">No exercises yet.</li>}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No workout assigned yet — ask your trainer.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">My progress</h2>
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const weight = Number(f.get('weight'));
            logProgress.mutate({
              weight: weight > 0 ? weight : undefined,
              notes: String(f.get('notes') || '') || undefined,
            });
            e.currentTarget.reset();
          }}
        >
          <Input label="Weight (kg)" name="weight" type="number" step="0.1" min={0} />
          <Input label="Note" name="notes" />
          <Button type="submit" disabled={logProgress.isPending}>
            Log
          </Button>
        </form>
        <ul className="divide-y divide-slate-100 text-sm">
          {(progressQ.data ?? []).map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span className="text-slate-500">{new Date(p.recordedAt).toLocaleDateString()}</span>
              <span>
                {p.weight != null ? `${p.weight} kg` : ''}
                {p.notes ? ` · ${p.notes}` : ''}
              </span>
            </li>
          ))}
          {(progressQ.data ?? []).length === 0 && <li className="py-2 text-slate-400">No entries yet.</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">My diet</h2>
        {dietQ.data?.[0] ? (
          <div>
            <div className="font-medium">{dietQ.data[0].title}</div>
            <div className="text-sm text-slate-500">
              {dietQ.data[0].targetCalories ? `${dietQ.data[0].targetCalories} kcal` : ''}
              {dietQ.data[0].macros
                ? ` · P${dietQ.data[0].macros.protein ?? 0}/C${dietQ.data[0].macros.carbs ?? 0}/F${dietQ.data[0].macros.fat ?? 0}`
                : ''}
            </div>
            {dietQ.data[0].meals && dietQ.data[0].meals.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {dietQ.data[0].meals.map((m, i) => (
                  <li key={i}>
                    {m.name}
                    {m.items ? `: ${m.items}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No diet plan assigned yet.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Payment history</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span className="font-mono text-xs text-slate-400">{p.invoiceNumber}</span>
              <span className="capitalize text-slate-500">{p.method}</span>
              <span>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</span>
              <span className="font-medium">${p.amount}</span>
            </li>
          ))}
          {payments.length === 0 && <li className="py-2 text-slate-400">No payments yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
