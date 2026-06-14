'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Badge, Card } from '@/components/ui';

interface Lead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: string;
  createdAt: string;
}

const STATUSES = ['new', 'contacted', 'converted', 'lost'];
const tone: Record<string, 'amber' | 'slate' | 'green' | 'red'> = {
  new: 'amber',
  contacted: 'slate',
  converted: 'green',
  lost: 'red',
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const leadsQ = useQuery({ queryKey: ['leads'], queryFn: () => apiFetch<Lead[]>('/leads') });
  const update = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      apiFetch(`/leads/${v.id}`, { method: 'PATCH', body: JSON.stringify({ status: v.status }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  const leads = leadsQ.data ?? [];
  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>
        {newCount > 0 && <Badge tone="amber">{newCount} new</Badge>}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium">{l.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{l.email ?? l.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{l.message ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{l.source ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={tone[l.status] ?? 'slate'}>{l.status}</Badge>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={l.status}
                      onChange={(e) => update.mutate({ id: l.id, status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.length === 0 && !leadsQ.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No leads yet. Share your public page to capture enquiries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
