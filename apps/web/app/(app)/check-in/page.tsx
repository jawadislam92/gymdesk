'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

interface CheckInResult {
  valid: boolean;
  member: { memberCode: string; fullName: string | null; status: string };
  membership: { endDate: string } | null;
}
interface AttendanceRow {
  id: string;
  checkedInAt: string;
  member: { memberCode: string; user: { fullName: string | null } | null } | null;
}

export default function CheckInPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayQuery = useQuery({
    queryKey: ['attendance', today],
    queryFn: () => apiFetch<AttendanceRow[]>(`/attendance?date=${today}`),
  });

  const checkIn = useMutation({
    mutationFn: (memberCode: string) =>
      apiFetch<CheckInResult>('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ memberCode }),
      }),
    onSuccess: (res) => {
      setResult(res);
      setCode('');
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) checkIn.mutate(code.trim());
  }

  const rows = todayQuery.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Check-in</h1>

      <Card className="mb-6">
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              label="Member code"
              placeholder="e.g. M0001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={checkIn.isPending}>
            {checkIn.isPending ? 'Checking…' : 'Check in'}
          </Button>
        </form>
        {checkIn.error && <p className="mt-3 text-sm text-red-600">{(checkIn.error as Error).message}</p>}

        {result && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              result.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="text-lg font-bold">
              {result.valid ? '✓ Membership valid' : '✗ Membership expired / inactive'}
            </div>
            <div className="text-sm">
              {result.member.fullName} ({result.member.memberCode})
              {result.membership && ` — expires ${new Date(result.membership.endDate).toLocaleDateString()}`}
            </div>
          </div>
        )}
      </Card>

      <h2 className="mb-3 font-semibold text-slate-700">Today&apos;s check-ins ({rows.length})</h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Member</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(a.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.member?.memberCode}</td>
                <td className="px-4 py-3">{a.member?.user?.fullName ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No check-ins yet today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
