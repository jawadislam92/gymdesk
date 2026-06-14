'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Point {
  label: string;
  value: number;
}

function BarChart({ data, money = false }: { data: Point[]; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-slate-400">No data yet.</p>;
  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end">
          <div className="mb-1 text-xs font-medium text-slate-600">
            {money ? `$${d.value}` : d.value}
          </div>
          <div
            className="w-full rounded-t bg-brand"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
          />
          <div className="mt-1 text-[10px] text-slate-400">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function downloadCsv(filename: string, rows: Point[], valueHeader: string) {
  const csv = [`label,${valueHeader}`, ...rows.map((r) => `${r.label},${r.value}`)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const revenue = useQuery({ queryKey: ['report-revenue'], queryFn: () => apiFetch<Point[]>('/reports/revenue') });
  const growth = useQuery({ queryKey: ['report-growth'], queryFn: () => apiFetch<Point[]>('/reports/membership-growth') });
  const attendance = useQuery({ queryKey: ['report-attendance'], queryFn: () => apiFetch<Point[]>('/reports/attendance') });
  const expenses = useQuery({ queryKey: ['report-expenses'], queryFn: () => apiFetch<Point[]>('/reports/expenses') });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Revenue (last 6 months)</h2>
          <Button
            variant="ghost"
            disabled={!revenue.data?.length}
            onClick={() => downloadCsv('revenue.csv', revenue.data ?? [], 'revenue')}
          >
            Download CSV
          </Button>
        </div>
        <BarChart data={revenue.data ?? []} money />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Expenses (last 6 months)</h2>
          <BarChart data={expenses.data ?? []} money />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Net profit (6 months)</h2>
          {(() => {
            const rev = (revenue.data ?? []).reduce((s, p) => s + p.value, 0);
            const exp = (expenses.data ?? []).reduce((s, p) => s + p.value, 0);
            const profit = rev - exp;
            return (
              <div>
                <div className={`text-4xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${profit.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Revenue ${rev.toLocaleString()} − Expenses ${exp.toLocaleString()}
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">New members (last 6 months)</h2>
          <BarChart data={growth.data ?? []} />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Check-ins (last 14 days)</h2>
          <BarChart data={attendance.data ?? []} />
        </Card>
      </div>
    </div>
  );
}
