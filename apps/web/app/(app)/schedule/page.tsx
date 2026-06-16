'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, UserPlus, X } from 'lucide-react';
import { PERMISSIONS } from '@gymflow/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from '@/components/ui';

interface ClassItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  location: string | null;
  isCancelled: boolean;
  trainerId: string | null;
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
const pad = (n: number) => String(n).padStart(2, '0');
function dateStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeStr(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CLASSES_MANAGE);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [classModal, setClassModal] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [bookFor, setBookFor] = useState<ClassItem | null>(null);
  const [bookMemberId, setBookMemberId] = useState('');
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
  const trainersQ = useQuery({ queryKey: ['trainers'], queryFn: () => apiFetch<Trainer[]>('/trainers').catch(() => []) });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['classes'] });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing
        ? apiFetch(`/classes/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : apiFetch('/classes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setNotice(editing ? 'Class updated ✓' : 'Class added to the schedule ✓');
      setClassModal(false);
      setEditing(null);
      refresh();
    },
  });
  const book = useMutation({
    mutationFn: ({ classId, memberId }: { classId: string; memberId: string }) =>
      apiFetch(`/classes/${classId}/book`, { method: 'POST', body: JSON.stringify({ memberId }) }),
    onSuccess: () => {
      setNotice('Member booked ✓');
      setBookFor(null);
      refresh();
    },
    onError: (e) => setNotice((e as Error).message),
  });
  const cancelClass = useMutation({
    mutationFn: (id: string) => apiFetch(`/classes/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      setNotice('Class cancelled');
      refresh();
    },
  });

  function openAdd() {
    setEditing(null);
    setClassModal(true);
  }
  function openEdit(c: ClassItem) {
    setEditing(c);
    setClassModal(true);
  }
  function openBook(c: ClassItem) {
    setBookFor(c);
    setBookMemberId('');
  }

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get('date'));
    const body: Record<string, unknown> = {
      title: String(f.get('title') ?? '').trim(),
      startsAt: new Date(`${date}T${f.get('startTime')}`).toISOString(),
      endsAt: new Date(`${date}T${f.get('endTime')}`).toISOString(),
      capacity: Number(f.get('capacity') || 0),
      location: String(f.get('location') ?? '').trim() || undefined,
      trainerId: String(f.get('trainerId') ?? '') || undefined,
    };
    if (!editing) body.repeatWeeks = Number(f.get('repeatWeeks') || 0);
    save.mutate(body);
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
  const todayStr = new Date().toDateString();

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Your weekly class timetable. Create classes (one-off or repeating), assign a trainer, set capacity, and book members in."
      >
        {canManage && (
          <Button onClick={openAdd}>
            <Plus size={16} /> Add class
          </Button>
        )}
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{notice}</div>}

      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * 864e5))}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[9rem] text-center text-sm font-semibold text-slate-700">{weekLabel}</span>
        <button
          onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * 864e5))}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-brand transition hover:bg-orange-50"
        >
          This week
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const items = classesFor(d);
          const isToday = d.toDateString() === todayStr;
          return (
            <div key={d.toISOString()}>
              <div
                className={`mb-2 text-sm font-semibold ${isToday ? 'text-brand' : 'text-slate-600'}`}
              >
                {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                {isToday && <span className="ml-1.5 text-xs font-normal text-brand">• today</span>}
              </div>
              <div className="space-y-2">
                {items.map((c) => {
                  const full = c.capacity > 0 && c.bookedCount >= c.capacity;
                  return (
                    <Card key={c.id} className={`p-3 ${c.isCancelled ? 'opacity-50' : ''}`}>
                      <div className="text-xs font-medium text-slate-400">
                        {fmtTime(c.startsAt)}–{fmtTime(c.endsAt)}
                      </div>
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      {c.trainerName && <div className="text-xs text-slate-500">with {c.trainerName}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        <Badge tone={c.isCancelled ? 'slate' : full ? 'red' : 'green'}>
                          {c.isCancelled ? 'cancelled' : `${c.bookedCount}${c.capacity ? `/${c.capacity}` : ''} booked`}
                        </Badge>
                        {!c.isCancelled && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => openBook(c)}
                              disabled={full}
                              aria-label="Book member"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand disabled:opacity-40"
                            >
                              <UserPlus size={15} />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEdit(c)}
                                  aria-label="Edit class"
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Cancel “${c.title}”?`)) cancelClass.mutate(c.id);
                                  }}
                                  aria-label="Cancel class"
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-300">
                    No classes
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / edit class */}
      <Modal
        open={classModal}
        onClose={() => {
          setClassModal(false);
          setEditing(null);
        }}
        title={editing ? `Edit “${editing.title}”` : 'Add a class'}
        description="Pick a day and time, assign a trainer, and set how many can book in."
        wide
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setClassModal(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="class-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add class'}
            </Button>
          </>
        }
      >
        <form id="class-form" onSubmit={onSave} className="space-y-4">
          <Input label="Class title" name="title" required placeholder="e.g. Morning HIIT" defaultValue={editing?.title ?? ''} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Input
              label="Date"
              name="date"
              type="date"
              required
              defaultValue={editing ? dateStr(editing.startsAt) : dateStr(new Date().toISOString())}
            />
            <Input
              label="Start time"
              name="startTime"
              type="time"
              required
              defaultValue={editing ? timeStr(editing.startsAt) : '09:00'}
            />
            <Input
              label="End time"
              name="endTime"
              type="time"
              required
              defaultValue={editing ? timeStr(editing.endsAt) : '10:00'}
            />
            <Select label="Trainer" name="trainerId" defaultValue={editing?.trainerId ?? ''}>
              <option value="">No trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
            <Input
              label="Capacity (0 = unlimited)"
              name="capacity"
              type="number"
              min={0}
              defaultValue={editing?.capacity ?? 10}
            />
            {!editing && (
              <Input label="Repeat for (weeks)" name="repeatWeeks" type="number" min={0} max={52} defaultValue={0} />
            )}
          </div>
          <Input label="Location (optional)" name="location" placeholder="e.g. Studio 1" defaultValue={editing?.location ?? ''} />
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        </form>
      </Modal>

      {/* Book a member */}
      <Modal
        open={!!bookFor}
        onClose={() => setBookFor(null)}
        title={bookFor ? `Book into ${bookFor.title}` : ''}
        description={bookFor ? `${fmtTime(bookFor.startsAt)} · ${bookFor.bookedCount}${bookFor.capacity ? `/${bookFor.capacity}` : ''} booked` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBookFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={book.isPending || !bookMemberId}
              onClick={() => bookFor && bookMemberId && book.mutate({ classId: bookFor.id, memberId: bookMemberId })}
            >
              {book.isPending ? 'Booking…' : 'Book member'}
            </Button>
          </>
        }
      >
        <Select label="Member" value={bookMemberId} onChange={(e) => setBookMemberId(e.target.value)}>
          <option value="">Select a member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.memberCode} — {m.fullName}
            </option>
          ))}
        </Select>
        {book.error && <p className="mt-2 text-sm text-red-600">{(book.error as Error).message}</p>}
      </Modal>
    </div>
  );
}
