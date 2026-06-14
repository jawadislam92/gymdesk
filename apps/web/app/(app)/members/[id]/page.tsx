'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card } from '@/components/ui';

interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  joinedAt: string;
  healthNotes: string | null;
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
            <p className="text-sm text-slate-400">No membership yet — sell a plan from the Members list.</p>
          )}
        </Card>
      </div>

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
          {payments.length === 0 && <li className="py-2 text-slate-400">No payments yet.</li>}
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
          {attendance.length === 0 && <li className="py-2 text-slate-400">No check-ins yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
