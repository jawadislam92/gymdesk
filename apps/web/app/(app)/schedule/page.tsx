'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { PERMISSIONS } from '@gymflow/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

interface ClassItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  location: string | null;
  isCancelled: boolean;
  trainerName: string | null;
  bookedCount: number;
}
interface Member {
  id: string;
  memberCode: string;
  fullName: string | null;
}
interface Trainer {
  id: string;
  fullName: string | null;
}
interface Paginated<T> {
  data: T[];
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLASSES_MANAGE);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showAdd, setShowAdd] = useState(false);
  const [bookFor, setBookFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const from = weekStart;
  const to = new Date(weekStart);
  to.setDate(to.getDate() + 7);

  const classesQ = useQuery({
    queryKey: ['classes', from.toISOString()],
    queryFn: () => apiFetch<ClassItem[]>(`/classes?from=${from.toISOString()}&to=${to.toISOString()}`),
  });
  const membersQ = useQuery({
    queryKey: ['members', 'sched'],
    queryFn: () => apiFetch<Paginated<Member>>('/members?pageSize=100'),
  });
  const trainersQ = useQuery({ queryKey: ['trainers'], queryFn: () => apiFetch<Trainer[]>('/trainers') });

  const addClass = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/classes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setShowAdd(false);
      void qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const book = useMutation({
    mutationFn: ({ classId, memberId }: { classId: string; memberId: string }) =>
      apiFetch(`/classes/${classId}/book`, { method: 'POST', body: JSON.stringify({ memberId }) }),
    onSuccess: () => {
      setBookFor(null);
      setNotice('Member booked ✓');
      void qc.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e) => setNotice((e as Error).message),
  });

  const cancelClass = useMutation({
    mutationFn: (id: string) => apiFetch(`/classes/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get('date'));
    addClass.mutate({
      title: String(f.get('title')),
      startsAt: new Date(`${date}T${f.get('startTime')}`).toISOString(),
      endsAt: new Date(`${date}T${f.get('endTime')}`).toISOString(),
      capacity: Number(f.get('capacity') || 0),
      location: String(f.get('location') || '') || undefined,
      trainerId: String(f.get('trainerId') || '') || undefined,
      repeatWeeks: Number(f.get('repeatWeeks') || 0),
    });
  }

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const classesFor = (d: Date) =>
    (classesQ.data ?? []).filter((c) => new Date(c.startsAt).toDateString() === d.toDateString());
  const members = membersQ.data?.data ?? [];
  const trainers = trainersQ.data ?? [];
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(
    to.getTime() - 1,
  ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * 864e5))}>
            ← Prev
          </Button>
          <span className="text-sm font-medium text-slate-600">{weekLabel}</span>
          <Button variant="ghost" onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * 864e5))}>
            Next →
          </Button>
          {canManage && <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Close' : 'Add class'}</Button>}
        </div>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      {showAdd && canManage && (
        <Card className="mb-6">
          <form onSubmit={onAdd} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="col-span-2">
              <Input label="Class title" name="title" required />
            </div>
            <Input label="Date" name="date" type="date" required />
            <Select label="Trainer" name="trainerId" defaultValue="">
              <option value="">— None —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
            <Input label="Start time" name="startTime" type="time" required />
            <Input label="End time" name="endTime" type="time" required />
            <Input label="Capacity (0 = ∞)" name="capacity" type="number" min={0} defaultValue={10} />
            <Input label="Repeat weeks" name="repeatWeeks" type="number" min={0} max={52} defaultValue={0} />
            <div className="col-span-2">
              <Input label="Location" name="location" />
            </div>
            <div className="col-span-2 flex items-end sm:col-span-4">
              <Button type="submit" disabled={addClass.isPending}>
                {addClass.isPending ? 'Saving…' : 'Create class'}
              </Button>
              {addClass.error && (
                <span className="ml-3 text-sm text-red-600">{(addClass.error as Error).message}</span>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const items = classesFor(d);
          return (
            <div key={d.toISOString()}>
              <div className="mb-2 text-sm font-semibold text-slate-600">
                {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-2">
                {items.map((c) => {
                  const full = c.capacity > 0 && c.bookedCount >= c.capacity;
                  return (
                    <Card key={c.id} className={`p-3 ${c.isCancelled ? 'opacity-50' : ''}`}>
                      <div className="text-xs text-slate-500">
                        {fmtTime(c.startsAt)}–{fmtTime(c.endsAt)}
                      </div>
                      <div className="font-medium">{c.title}</div>
                      {c.trainerName && <div className="text-xs text-slate-500">{c.trainerName}</div>}
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={c.isCancelled ? 'slate' : full ? 'red' : 'green'}>
                          {c.isCancelled ? 'cancelled' : `${c.bookedCount}${c.capacity ? `/${c.capacity}` : ''}`}
                        </Badge>
                      </div>
                      {!c.isCancelled && (
                        <div className="mt-2">
                          {bookFor === c.id ? (
                            <div className="flex flex-col gap-2">
                              <Select id={`bk-${c.id}`} defaultValue={members[0]?.id}>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.memberCode} — {m.fullName}
                                  </option>
                                ))}
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  disabled={book.isPending || full}
                                  onClick={() => {
                                    const sel = (document.getElementById(`bk-${c.id}`) as HTMLSelectElement)?.value;
                                    if (sel) book.mutate({ classId: c.id, memberId: sel });
                                  }}
                                >
                                  {full ? 'Full' : 'Confirm'}
                                </Button>
                                <Button variant="ghost" onClick={() => setBookFor(null)}>
                                  ✕
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="ghost" onClick={() => setBookFor(c.id)}>
                                Book
                              </Button>
                              {canManage && (
                                <Button variant="ghost" onClick={() => cancelClass.mutate(c.id)}>
                                  Cancel
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
                {items.length === 0 && <div className="text-xs text-slate-300">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
