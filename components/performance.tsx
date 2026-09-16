import { Panel } from "./ui";
import type { Attribution, HistoryPoint, MonthRow, RollingWindow } from "../lib/performance";

const K = 1000;
function usdK(v: number) {
  return `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v / K)).toLocaleString()}k`;
}

// ---------- heatmap ----------

function cellClass(pct: number): string {
  if (pct >= 3) return "bg-short/70 text-white";
  if (pct >= 1) return "bg-short/35 text-slate-100";
  if (pct > -1) return "bg-slate-600/25 text-slate-300";
  if (pct > -3) return "bg-long/30 text-slate-100";
  return "bg-long/60 text-slate-950";
}

export function Heatmap({ months }: { months: MonthRow[] }) {
  return (
    <Panel
      title="12-month heat"
      icon={<>▦</>}
      right={
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <i className="h-2 w-4 rounded-sm bg-long/60" />
          <i className="h-2 w-4 rounded-sm bg-short/40" />
          <i className="h-2 w-4 rounded-sm bg-short/70" />
          LOSS → GAIN
        </span>
      }
      className="h-full"
    >
      <div className="space-y-1 p-3">
        {months.map((m) => (
          <div key={m.month} className="grid items-center gap-1.5" style={{ gridTemplateColumns: "56px minmax(0,1fr) 64px" }}>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11.5px] font-medium text-slate-300">{m.month}</span>
              <span className="font-mono text-[9px] text-slate-600">{String(m.year).slice(2)}</span>
            </div>
            <div className="flex gap-1">
              {m.days.map((d, i) => (
                <span
                  key={i}
                  className={`h-5 flex-1 rounded-[3px] ${cellClass(d)}`}
                  title={`${m.month} d+${i + 1}: ${d > 0 ? "+" : ""}${d.toFixed(2)}%`}
                />
              ))}
            </div>
            <div className="text-right font-mono text-[11px] font-semibold tabular-nums">
              <span className={m.total >= 0 ? "text-long" : "text-short"}>
                {m.total > 0 ? "+" : ""}
                {m.total.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- attribution bars ----------

function Bars({ title, rows, totalPnl }: { title: string; rows: Attribution["byStrategy"]; totalPnl: number }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pnl)), 1);
  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{title}</span>
        <span className="font-mono text-[10px] tabular-nums text-slate-500">{usdK(totalPnl)}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => {
          const w = (Math.abs(r.pnl) / maxAbs) * 50; // half-width %
          return (
            <li key={r.name} className="grid items-center gap-1" style={{ gridTemplateColumns: "120px 1fr 72px" }}>
              <span className="truncate px-1 text-[11.5px] text-slate-400">{r.name}</span>
              <div className="relative h-4">
                <div className="absolute inset-y-0 left-1/2 w-px bg-edge" />
                <div
                  className={`absolute top-0.5 h-3 rounded-r-sm ${r.pnl >= 0 ? "left-1/2 bg-long/75" : "right-1/2 bg-short/75"}`}
                  style={{ width: `${w}%` }}
                />
              </div>
              <span className={`px-1 text-right font-mono text-[11px] tabular-nums ${r.pnl >= 0 ? "text-long" : "text-short"}`}>
                {usdK(r.pnl)} <span className="text-slate-600">· {r.pnl >= 0 ? "+" : ""}{r.pct.toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AttributionPanel({ attr }: { attr: Attribution }) {
  return (
    <Panel
      title="Attribution"
      icon={<>⌖</>}
      right={<span className="font-mono text-[10.5px] text-slate-500">trailing 6m</span>}
      className="h-full"
    >
      <div className="space-y-5 p-4">
        <Bars title="By strategy" rows={attr.byStrategy} totalPnl={attr.byStrategy.reduce((a, b) => a + b.pnl, 0)} />
        <Bars title="By symbol" rows={attr.bySymbol} totalPnl={attr.bySymbol.reduce((a, b) => a + b.pnl, 0)} />
        <Bars title="By factor" rows={attr.byFactor} totalPnl={attr.byFactor.reduce((a, b) => a + b.pnl, 0)} />
      </div>
    </Panel>
  );
}

// ---------- history chart ----------

const W = 720;
const H = 240;
const PL = 8;
const PR = 8;
const PT = 12;
const PB = 4;

export function HistoryChart({ hist }: { hist: HistoryPoint[] }) {
  const selfs = hist.map((p) => p.selfPct);
  const bens = hist.map((p) => p.benchPct);
  const lo = Math.min(...selfs, ...bens, 0) - 1;
  const hi = Math.max(...selfs, ...bens) + 1;
  const pw = W - PL - PR;
  const ph = H - PT - PB;
  const n = hist.length;
  const x = (i: number) => PL + (i / (n - 1)) * pw;
  const y = (v: number) => PT + ph - ((v - lo) / (hi - lo)) * ph;
  const toPts = (vals: number[]) => vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${y(lo).toFixed(1)} ${toPts(selfs)} ${x(n - 1).toFixed(1)},${y(lo).toFixed(1)}`;
  const zero = y(0);
  const lastSelf = selfs[n - 1];
  const lastBench = bens[n - 1];

  return (
    <Panel
      title="Curve vs benchmark"
      icon={<>∿</>}
      right={
        <div className="flex items-center gap-3 font-mono text-[10.5px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <i className="h-1.5 w-3.5 rounded-full bg-accent" /> SELF <b className="text-accent-2">{lastSelf > 0 ? "+" : ""}{lastSelf.toFixed(1)}%</b>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <i className="h-0 w-3.5 border-t border-dashed border-slate-500" /> BENCH <b className="text-slate-300">{lastBench > 0 ? "+" : ""}{lastBench.toFixed(1)}%</b>
          </span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[240px] w-full" preserveAspectRatio="none" role="img" aria-label="Self vs benchmark return history">
        <defs>
          <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[-0.25, 0, 0.25, 0.5].map((f) => {
          const gy = PT + ph * (1 - f);
          return <line key={f} x1={PL} x2={W - PR} y1={gy} y2={gy} stroke="var(--color-edge)" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />;
        })}
        <line x1={PL} x2={W - PR} y1={zero} y2={zero} stroke="var(--color-muted)" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
        <polygon points={area} fill="url(#hist-grad)" />
        <polyline points={toPts(bens)} fill="none" stroke="var(--color-muted)" strokeWidth="1.4" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <polyline points={toPts(selfs)} fill="none" stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(n - 1)} cy={y(lastSelf)} r="3.5" fill="var(--color-accent-2)" />
        <circle cx={x(n - 1)} cy={y(lastBench)} r="3" fill="var(--color-muted)" />
      </svg>
      <div className="flex items-center justify-between px-4 pb-3 font-mono text-[10px] text-slate-600">
        <span>90 days · equity-normalized %</span>
        <span>gap {lastSelf - lastBench > 0 ? "+" : ""}{(lastSelf - lastBench).toFixed(1)}pt</span>
      </div>
    </Panel>
  );
}

// ---------- rolling strip ----------

export function RollingStrip({ windows }: { windows: RollingWindow[] }) {
  return (
    <Panel title="Rolling windows" icon={<>⧖</>} right={<span className="font-mono text-[10.5px] text-slate-500">sharpe · win% · PF · Δ%</span>}>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
        {windows.map((w) => (
          <div key={w.label} className="rounded-lg border border-edge bg-surface-2/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{w.label}</span>
              <span className={`font-mono text-[12px] font-semibold tabular-nums ${w.pnlPct >= 0 ? "text-long" : "text-short"}`}>
                {w.pnlPct > 0 ? "+" : ""}
                {w.pnlPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <div>
                <div className="font-mono text-[13.5px] font-semibold tabular-nums text-slate-100">{w.sharpe.toFixed(1)}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-600">sharpe</div>
              </div>
              <div>
                <div className="font-mono text-[13.5px] font-semibold tabular-nums text-slate-100">{w.winRate}%</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-600">win</div>
              </div>
              <div>
                <div className="font-mono text-[13.5px] font-semibold tabular-nums text-slate-100">{w.profitFactor.toFixed(1)}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-600">PF</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
