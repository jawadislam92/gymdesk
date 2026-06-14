'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card } from '@/components/ui';

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
