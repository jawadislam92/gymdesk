'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Button, Card, PageHeader } from '@/components/ui';
import { BarChart, LineChart } from '@/components/charts';

interface Point {
  label: string;
  value: number;
}

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', AED: 'AED ' };

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
  const gymQ = useQuery({ queryKey: ['gym'], queryFn: () => apiFetch<{ currency: string }>('/gym') });
  const currency = gymQ.data?.currency ?? 'USD';
  const sym = SYMBOL[currency] ?? `${currency} `;

  const sum = (d?: Point[]) => (d ?? []).reduce((s, p) => s + p.value, 0);
  const rev = sum(revenue.data);
  const exp = sum(expenses.data);
  const profit = rev - exp;
  const money = (n: number) => `${sym}${n.toLocaleString()}`;

  const KPIS = [
    { label: 'Revenue (6 mo)', value: money(rev), tone: 'text-slate-900' },
    { label: 'Expenses (6 mo)', value: money(exp), tone: 'text-slate-900' },
    { label: 'Net profit (6 mo)', value: money(profit), tone: profit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'New members (6 mo)', value: sum(growth.data).toLocaleString(), tone: 'text-slate-900' },
    { label: 'Check-ins (14 days)', value: sum(attendance.data).toLocaleString(), tone: 'text-slate-900' },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="The numbers behind the business — revenue, profit, membership growth, and attendance trends at a glance."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <div className="text-sm font-medium text-slate-500">{k.label}</div>
            <div className={`mt-1 text-2xl font-bold tracking-tight ${k.tone}`}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Revenue</h2>
          <Button
            variant="ghost"
            disabled={!revenue.data?.length}
            onClick={() => downloadCsv('revenue.csv', revenue.data ?? [], 'revenue')}
          >
            Download CSV
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-400">Collected payments per month · last 6 months</p>
        <LineChart data={revenue.data ?? []} money symbol={sym} />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-bold text-slate-900">New members</h2>
          <p className="mb-3 text-xs text-slate-400">Joined per month · last 6 months</p>
          <BarChart data={growth.data ?? []} />
        </Card>
        <Card>
          <h2 className="mb-1 font-bold text-slate-900">Check-ins</h2>
          <p className="mb-3 text-xs text-slate-400">Daily attendance · last 14 days</p>
          <LineChart data={attendance.data ?? []} />
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Expenses</h2>
          <Button
            variant="ghost"
            disabled={!expenses.data?.length}
            onClick={() => downloadCsv('expenses.csv', expenses.data ?? [], 'expenses')}
          >
            Download CSV
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-400">Recorded costs per month · last 6 months</p>
        <BarChart data={expenses.data ?? []} money symbol={sym} />
      </Card>
    </div>
  );
}
