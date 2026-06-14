'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Card } from '@/components/ui';

interface Trainer {
  id: string;
  fullName: string | null;
  email: string | null;
  specialization: string | null;
  isActive: boolean;
  memberCount: number;
}
interface TrainerMember {
  id: string;
  memberCode: string;
  fullName: string | null;
  status: string;
}

export default function TrainersPage() {
  const [open, setOpen] = useState<string | null>(null);
  const trainersQ = useQuery({ queryKey: ['trainers'], queryFn: () => apiFetch<Trainer[]>('/trainers') });
  const membersQ = useQuery({
    queryKey: ['trainer-members', open],
    queryFn: () => apiFetch<TrainerMember[]>(`/trainers/${open}/members`),
    enabled: Boolean(open),
  });

  const trainers = trainersQ.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Trainers</h1>
      <div className="space-y-3">
        {trainers.map((t) => (
          <Card key={t.id}>
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpen(open === t.id ? null : t.id)}
            >
              <div>
                <div className="font-semibold">{t.fullName}</div>
                <div className="text-sm text-slate-500">{t.specialization ?? t.email}</div>
              </div>
              <Badge>{t.memberCount} members</Badge>
            </button>
            {open === t.id && (
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2 text-sm">
                {(membersQ.data ?? []).map((m) => (
                  <li key={m.id} className="flex justify-between py-2">
                    <span>
                      <span className="font-mono text-xs text-slate-400">{m.memberCode}</span> {m.fullName}
                    </span>
                    <span className="text-slate-500">{m.status}</span>
                  </li>
                ))}
                {membersQ.data?.length === 0 && (
                  <li className="py-2 text-slate-400">No members assigned yet.</li>
                )}
              </ul>
            )}
          </Card>
        ))}
        {trainers.length === 0 && !trainersQ.isLoading && (
          <p className="text-slate-400">
            No trainers yet. Invite one from Settings → Team (role: trainer).
          </p>
        )}
      </div>
    </div>
  );
}
