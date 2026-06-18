'use client';

interface Point {
  label: string;
  value: number;
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  const r = n / p;
  const nice = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10;
  return nice * p;
}
function compact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(Math.round(v));
}
function fmtLabel(l: string): string {
  const parts = l.split('-');
  if (parts.length === 3) return new Date(`${l}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  if (parts.length === 2) return new Date(`${l}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
  return l;
}

const BRAND = '#f97316';
const GRID = '#e2e8f0';
const AXIS = '#94a3b8';

function Empty() {
  return <div className="flex h-44 items-center justify-center text-sm text-slate-400">No data yet.</div>;
}

export function LineChart({
  data,
  money = false,
  symbol = '$',
  height = 200,
}: {
  data: Point[];
  money?: boolean;
  symbol?: string;
  height?: number;
}) {
  if (!data.length) return <Empty />;
  const W = 640;
  const H = height;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceCeil(Math.max(1, ...data.map((d) => d.value)));
  const n = data.length;
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const fmtY = (v: number) => (money ? `${symbol}${compact(v)}` : compact(v));
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = `${x(0)},${padT + plotH} ${line} ${x(n - 1)},${padT + plotH}`;
  const step = Math.max(1, Math.ceil(n / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="trend chart">
      {[0, 0.5, 1].map((g) => {
        const gy = padT + plotH - g * plotH;
        return (
          <g key={g}>
            <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={GRID} strokeWidth="1" />
            <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="11" fill={AXIS}>
              {fmtY(g * max)}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={BRAND} fillOpacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke={BRAND}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(n - 1)} cy={y(data[n - 1].value)} r="3.5" fill={BRAND} />
      {data.map((d, i) =>
        i % step === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS}>
            {fmtLabel(d.label)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function BarChart({
  data,
  money = false,
  symbol = '$',
  height = 200,
}: {
  data: Point[];
  money?: boolean;
  symbol?: string;
  height?: number;
}) {
  if (!data.length) return <Empty />;
  const W = 640;
  const H = height;
  const padL = 46;
  const padR = 14;
  const padT = 18;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceCeil(Math.max(1, ...data.map((d) => d.value)));
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.min(48, slot * 0.6);
  const fmtY = (v: number) => (money ? `${symbol}${compact(v)}` : compact(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="bar chart">
      {[0, 0.5, 1].map((g) => {
        const gy = padT + plotH - g * plotH;
        return (
          <g key={g}>
            <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={GRID} strokeWidth="1" />
            <text x={padL - 8} y={gy + 3} textAnchor="end" fontSize="11" fill={AXIS}>
              {fmtY(g * max)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const h = (d.value / max) * plotH;
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={padT + plotH - h} width={barW} height={h} rx="4" fill={BRAND} />
            {d.value > 0 && (
              <text x={cx} y={padT + plotH - h - 5} textAnchor="middle" fontSize="11" fontWeight="500" fill="#475569">
                {money ? `${symbol}${compact(d.value)}` : d.value}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS}>
              {fmtLabel(d.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
