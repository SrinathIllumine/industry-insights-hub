import { useState } from "react";

import type { SnapshotChart, SnapshotPoint } from "@/lib/industry-snapshot";

const COLORS = {
  green: "#1b6e4f", // high growth / high profitability
  olive: "#9c8a2e", // low growth  / high profitability
  red: "#a8442e", // high growth / low profitability
  gray: "#8a8a82", // low growth  / low profitability
} as const;

const TINT = {
  tl: "#f7f1dc",
  tr: "#eaf3ea",
  bl: "#f5f5f2",
  br: "#fbeeec",
} as const;

const LEGEND = [
  { c: COLORS.green, t: "High growth / High profitability" },
  { c: COLORS.olive, t: "Low growth / High profitability" },
  { c: COLORS.red, t: "High growth / Low profitability" },
  { c: COLORS.gray, t: "Low growth / Low profitability" },
] as const;

const W = 900;
const H = 560;
const M = { l: 66, r: 20, t: 34, b: 58 };

function quadColor(x: number, y: number, xd: number, yd: number): string {
  return x > xd ? (y > yd ? COLORS.green : COLORS.red) : y > yd ? COLORS.olive : COLORS.gray;
}

function niceStep(x: number): number {
  if (!(x > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / p;
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
}

function ticks(min: number, max: number): number[] {
  if (!(max > min)) return [];
  const step = niceStep((max - min) / 5);
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9 && out.length < 14; t += step) {
    out.push(Math.round(t * 100) / 100);
  }
  return out;
}

function shortLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*/g, " ").trim() || "Y";
}

export function BubbleMatrix({ chart }: { chart: SnapshotChart }) {
  const [hover, setHover] = useState<number | null>(null);

  const { xMin, xMax, yMin, yMax } = chart;
  const xd = chart.xDivider;
  const yd = chart.yDivider;
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const sx = xMax === xMin ? 1 : iw / (xMax - xMin);
  const sy = yMax === yMin ? 1 : ih / (yMax - yMin);
  const px = (x: number) => M.l + (x - xMin) * sx;
  const py = (y: number) => M.t + ih - (y - yMin) * sy;
  const clampX = (v: number) => Math.max(M.l, Math.min(W - M.r, v));
  const clampY = (v: number) => Math.max(M.t, Math.min(H - M.b, v));

  const maxRev = Math.max(1, ...chart.points.map((p) => p.rev));
  const rootMax = Math.sqrt(maxRev);
  const rOf = (rev: number) => 7 + 22 * (Math.sqrt(Math.max(0, rev)) / rootMax || 0);

  const xdp = clampX(px(xd));
  const ydp = clampY(py(yd));
  const yShort = shortLabel(chart.yLabel);

  const hovered = hover != null ? chart.points[hover] : undefined;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img">
        <rect x={M.l} y={M.t} width={Math.max(0, xdp - M.l)} height={Math.max(0, ydp - M.t)} fill={TINT.tl} />
        <rect x={xdp} y={M.t} width={Math.max(0, W - M.r - xdp)} height={Math.max(0, ydp - M.t)} fill={TINT.tr} />
        <rect x={M.l} y={ydp} width={Math.max(0, xdp - M.l)} height={Math.max(0, H - M.b - ydp)} fill={TINT.bl} />
        <rect x={xdp} y={ydp} width={Math.max(0, W - M.r - xdp)} height={Math.max(0, H - M.b - ydp)} fill={TINT.br} />

        {ticks(xMin, xMax).map((t) => (
          <g key={`x${t}`}>
            <line x1={px(t)} y1={M.t} x2={px(t)} y2={H - M.b} stroke="#ededea" />
            <text x={px(t)} y={H - M.b + 16} textAnchor="middle" fontSize="10" fill="#999">
              {t}%
            </text>
          </g>
        ))}
        {ticks(yMin, yMax).map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} y1={py(t)} x2={W - M.r} y2={py(t)} stroke="#ededea" />
            <text x={M.l - 8} y={py(t) + 3} textAnchor="end" fontSize="10" fill="#999">
              {t}%
            </text>
          </g>
        ))}

        <rect x={M.l} y={M.t} width={iw} height={ih} fill="none" stroke="#e5e5e0" />
        <line x1={xdp} y1={M.t} x2={xdp} y2={H - M.b} stroke="#b5b5ab" strokeDasharray="4 4" />
        <line x1={M.l} y1={ydp} x2={W - M.r} y2={ydp} stroke="#b5b5ab" strokeDasharray="4 4" />

        <text x={M.l + 8} y={M.t + 14} fontSize="10" fontWeight="bold" fill="#8a8a82" opacity="0.85">
          LOW GROWTH / HIGH PROFITABILITY
        </text>
        <text x={W - M.r - 8} y={M.t + 14} textAnchor="end" fontSize="10" fontWeight="bold" fill="#8a8a82" opacity="0.85">
          HIGH GROWTH / HIGH PROFITABILITY
        </text>
        <text x={M.l + 8} y={H - M.b - 7} fontSize="10" fontWeight="bold" fill="#8a8a82" opacity="0.85">
          LOW GROWTH / LOW PROFITABILITY
        </text>
        <text x={W - M.r - 8} y={H - M.b - 7} textAnchor="end" fontSize="10" fontWeight="bold" fill="#8a8a82" opacity="0.85">
          HIGH GROWTH / LOW PROFITABILITY
        </text>

        <text x={M.l + iw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#888">
          {chart.xLabel}
        </text>
        <text
          x={16}
          y={M.t + ih / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#888"
          transform={`rotate(-90 16 ${M.t + ih / 2})`}
        >
          {chart.yLabel}
        </text>

        {chart.points.map((p, i) => {
          const cx = px(p.x);
          const cy = py(p.y);
          const r = rOf(p.rev);
          const c = quadColor(p.x, p.y, xd, yd);
          return (
            <g
              key={`${p.label}-${i}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={c}
                fillOpacity={hover === i ? 0.95 : 0.8}
                stroke={c}
                strokeWidth={1.5}
              />
              <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize="10" fill="#2a2a2a">
                {p.label}
              </text>
            </g>
          );
        })}

        {hovered ? (
          <Tooltip
            p={hovered}
            x={clampX(px(hovered.x))}
            y={clampY(py(hovered.y))}
            yShort={yShort}
          />
        ) : null}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.t} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: l.c }} />
            {l.t}
          </span>
        ))}
      </div>
      {chart.footnote ? (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/80">{chart.footnote}</p>
      ) : null}
    </div>
  );
}

function Tooltip({
  p,
  x,
  y,
  yShort,
}: {
  p: SnapshotPoint;
  x: number;
  y: number;
  yShort: string;
}) {
  const lines = [
    `CAGR:  ${p.x.toFixed(1)}%`,
    `${yShort}:  ${p.y.toFixed(2)}%`,
    `Revenue:  ${p.rev.toLocaleString("en-IN")}`,
    ...(p.note ? [`Basis: ${p.note}`] : []),
  ];
  const longest = Math.max(p.label.length, ...lines.map((l) => l.length));
  const bw = Math.min(W - 8, longest * 6.1 + 20);
  const bh = lines.length * 14 + 24;
  let bx = x + 14;
  let by = y - bh - 12;
  if (bx + bw > W - 4) bx = x - bw - 14;
  if (bx < 4) bx = 4;
  if (by < 4) by = y + 14;

  return (
    <g pointerEvents="none">
      <rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#1a1a1a" opacity="0.96" />
      <text x={bx + 10} y={by + 16} fontSize="11" fontWeight="bold" fill="#ffffff">
        {p.label}
      </text>
      {lines.map((l, i) => (
        <text
          key={i}
          x={bx + 10}
          y={by + 32 + i * 14}
          fontSize="10"
          fill="#e5e5e0"
          fontFamily="ui-monospace, monospace"
        >
          {l}
        </text>
      ))}
    </g>
  );
}
