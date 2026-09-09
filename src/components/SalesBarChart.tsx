"use client";
import { money } from "@/lib/format";

export function SalesBarChart({ data }: { data: { date: string; total: number }[] }) {
  if (!data.length) return <div className="chart-empty">No sales in this range.</div>;

  const width = 720,
    height = 220,
    padL = 44,
    padR = 12,
    padT = 12,
    padB = 28;
  const plotW = width - padL - padR,
    plotH = height - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.total));
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const barGap = 8;
  const barW = Math.max(6, plotW / data.length - barGap);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Sales by day">
        {ticks.map((t, i) => {
          const y = padT + plotH - (t / niceMax) * plotH;
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--border-soft)" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="var(--text-faint)">
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * (plotW / data.length) + (plotW / data.length - barW) / 2;
          const h = (d.total / niceMax) * plotH;
          const y = padT + plotH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(h, d.total > 0 ? 2 : 0)} rx={3} fill="var(--blue)">
                <title>{`${d.date}: ${money(d.total)}`}</title>
              </rect>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
