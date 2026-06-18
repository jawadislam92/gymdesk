'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, DoorOpen, Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, PageHeader } from '@/components/ui';

interface MemberHit {
  id: string;
  memberCode: string;
  fullName: string | null;
  status: string;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}
interface Lookup {
  member: { id: string; memberCode: string; fullName: string | null; status: string };
  membership: { planName: string | null; endDate: string; valid: boolean; daysLeft: number | null } | null;
  dues: number;
  lastCheckIn: string | null;
}
interface AttendanceRow {
  id: string;
  checkedInAt: string;
  member: { memberCode: string; user: { fullName: string | null } | null } | null;
}

function initials(name: string | null) {
  return (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CheckInPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ name: string; time: string } | null>(null);

  // Local calendar day (not UTC) so "today" matches the gym's clock — otherwise a
  // check-in late in the day can land on the wrong date in +/- UTC timezones.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayQuery = useQuery({
    queryKey: ['attendance', today],
    queryFn: () => apiFetch<AttendanceRow[]>(`/attendance?date=${today}`),
  });
  const searchQuery = useQuery({
    queryKey: ['member-search', search],
    queryFn: () => apiFetch<Paginated<MemberHit>>(`/members?pageSize=8&search=${encodeURIComponent(search)}`),
    enabled: !selectedId && search.trim().length >= 1,
  });
  const lookupQuery = useQuery({
    queryKey: ['checkin-lookup', selectedId],
    queryFn: () => apiFetch<Lookup>(`/attendance/lookup?memberId=${selectedId}`),
    enabled: !!selectedId,
  });

  const checkIn = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch<{ member: { fullName: string | null } }>('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      }),
    onSuccess: (res) => {
      setConfirmation({
        name: res.member.fullName ?? 'Member',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setSelectedId(null);
      setSearch('');
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function reset() {
    setSelectedId(null);
    setSearch('');
  }

  const hits = searchQuery.data?.data ?? [];
  const look = lookupQuery.data;
  const rows = todayQuery.data ?? [];

  const issue = look ? !look.membership?.valid || look.dues > 0 : false;

  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Search a member, confirm their membership at a glance, and check them in. Expired plans and unpaid balances are flagged before you let them in."
      />

      {confirmation && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-800">
          <CheckCircle2 size={20} />
          <span className="font-semibold">Welcome, {confirmation.name}!</span>
          <span className="text-sm text-green-700">Checked in at {confirmation.time}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          {!selectedId && (
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member by name, code or phone…"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>
          )}

          {/* Search results */}
          {!selectedId && search.trim().length >= 1 && (
            <div className="mt-3 divide-y divide-slate-100">
              {hits.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id);
                    setConfirmation(null);
                  }}
                  className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {initials(m.fullName)}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{m.fullName}</span>
                    <span className="block font-mono text-xs text-slate-500">{m.memberCode}</span>
                  </span>
                  <Badge tone={m.status === 'active' ? 'green' : m.status === 'expired' ? 'red' : 'slate'}>
                    {m.status}
                  </Badge>
                </button>
              ))}
              {hits.length === 0 && !searchQuery.isLoading && (
                <p className="py-6 text-center text-sm text-slate-500">No members match “{search}”.</p>
              )}
            </div>
          )}

          {!selectedId && search.trim().length === 0 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              Start typing a member’s name or code to check them in.
            </p>
          )}

          {/* Selected member status card */}
          {selectedId && (
            <div>
              {lookupQuery.isLoading || !look ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
                        {initials(look.member.fullName)}
                      </span>
                      <div>
                        <div className="text-lg font-bold text-slate-900">{look.member.fullName}</div>
                        <div className="font-mono text-xs text-slate-500">{look.member.memberCode}</div>
                      </div>
                    </div>
                    <button onClick={reset} aria-label="Search again" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Membership status banner */}
                  <div
                    className={`mt-4 rounded-xl px-4 py-3 ${
                      look.membership?.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {look.membership?.valid ? (
                      <>
                        <div className="font-semibold">Membership active</div>
                        <div className="text-sm">
                          {look.membership.planName ?? 'Plan'} · {look.membership.daysLeft} day
                          {look.membership.daysLeft === 1 ? '' : 's'} left · expires{' '}
                          {new Date(look.membership.endDate).toLocaleDateString()}
                        </div>
                      </>
                    ) : look.membership ? (
                      <>
                        <div className="font-semibold">Membership expired</div>
                        <div className="text-sm">
                          Ended {new Date(look.membership.endDate).toLocaleDateString()} — offer a renewal.
                        </div>
                      </>
                    ) : (
                      <div className="font-semibold">No active membership on file</div>
                    )}
                  </div>

                  {look.dues > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
                      <AlertTriangle size={18} />
                      <span className="text-sm">
                        <span className="font-semibold">Outstanding balance: ${look.dues}</span> — collect at the desk.
                      </span>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-500">
                    {look.lastCheckIn
                      ? `Last visit: ${new Date(look.lastCheckIn).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'First visit on record.'}
                  </div>

                  <button
                    onClick={() => checkIn.mutate(look.member.id)}
                    disabled={checkIn.isPending}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-white transition active:scale-[.99] disabled:opacity-50 ${
                      issue ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <DoorOpen size={20} />
                    {checkIn.isPending ? 'Checking in…' : issue ? 'Check in anyway' : 'Check in'}
                  </button>
                  {checkIn.error && (
                    <p className="mt-2 text-center text-sm text-red-600">{(checkIn.error as Error).message}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Today's check-ins */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Today · {rows.length} in
          </h2>
          <Card className="max-h-[28rem] overflow-y-auto p-0">
            <ul className="divide-y divide-slate-100">
              {rows.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                    {initials(a.member?.user?.fullName ?? null)}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">
                    {a.member?.user?.fullName ?? a.member?.memberCode}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(a.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
              {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-500">No check-ins yet today.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
