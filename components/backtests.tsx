import { Panel, LiveDot } from "./ui";
import type { BacktestRun, RunMetrics } from "../lib/backtests";

type Tone = "pos" | "neg" | "neu";

export function MetricChip({ label, value, tone, unit }: { label: string; value: string; tone: Tone; unit?: string }) {
  const color = tone === "pos" ? "text-long" : tone === "neg" ? "text-short" : "text-slate-200";
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-edge bg-surface-2/40 px-2.5 py-2">
      <span className="text-[9.5px] uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className={`font-mono text-[14px] font-semibold tabular-nums ${color}`}>
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-normal text-slate-500">{unit}</span>}
      </span>
    </div>
  );
}

// ---------- svg charts ----------

// maps a value range into [1, h-1] for viewBox 0 0 100 32
function normPoints(values: number[], w = 100, h = 32): string {
  if (values.length < 2) return "";
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1e-9) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const step = w / (values.length - 1);
  return values.map((v, i) => `${(i * step).toFixed(2)},${(1 + (1 - (v - min) / span) * (h - 2)).toFixed(2)}`).join(" ");
}

function ChartArea({ values, stroke, fillId, fill }: { values: number[]; stroke: string; fillId: string; fill: string }) {
  const pts = normPoints(values, 100, 32);
  const area = pts ? `0,32 ${pts} 100,32` : "";
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-[120px] w-full" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[8, 16, 24].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(100,116,139,0.15)" strokeWidth="0.3" />
      ))}
      <polygon points={area} fill={`url(#${fillId})`} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function EquityArea({ values }: { values: number[] }) {
  const up = values.length > 1 && values[values.length - 1] >= values[0];
  return <ChartArea values={values} stroke={up ? "var(--color-long)" : "var(--color-short)"} fill={up ? "var(--color-long)" : "var(--color-short)"} fillId={`eq-${up ? "u" : "d"}`} />;
}

export function DrawdownArea({ values }: { values: number[] }) {
  return <ChartArea values={values} stroke="var(--color-short)" fillId="dd-f" fill="var(--color-short)" />;
}

// ---------- runs table ----------

function usd(v: number) {
  const s = v < 0 ? "-$" : "$";
  return s + Math.abs(Math.round(v)).toLocaleString();
}

export function RunsTable({
  runs,
  selectedId,
  onSelect,
  onRerun,
  rerunningId,
}: {
  runs: BacktestRun[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRerun: (id: string) => void;
  rerunningId: string | null;
}) {
  return (
    <Panel title="Runs" icon={<>▦</>} right={<span className="font-mono text-[11px] text-slate-500">{runs.length} evaluations</span>} className="h-full">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[12px]">
          <thead>
            <tr className="border-b border-edge text-[10px] uppercase tracking-[0.1em] text-slate-500">
              {["Run", "Sym", "TF", "Net PnL", "Sharpe", "Max DD", "Win", "Trades", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const sel = r.id === selectedId;
              const pos = r.metrics.netPnl >= 0;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={[
                    "cursor-pointer border-b border-edge/50 transition-colors",
                    sel ? "bg-accent/10 ring-1 ring-inset ring-accent/40" : "hover:bg-white/[0.03]",
                  ].join(" ")}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {sel && <LiveDot color="var(--color-accent)" />}
                      <div>
                        <div className="text-slate-100">{r.label}</div>
                        <div className="text-[10.5px] text-slate-500">{r.strategy} · {r.rangeText}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{r.symbol}</td>
                  <td className="px-2 py-2 text-slate-400">{r.timeframe}</td>
                  <td className={`px-2 py-2 tabular-nums ${pos ? "text-long" : "text-short"}`}>{usd(r.metrics.netPnl)}</td>
                  <td className="px-2 py-2 tabular-nums text-slate-200">{r.metrics.sharpe.toFixed(2)}</td>
                  <td className="px-2 py-2 tabular-nums text-amber">{r.metrics.maxDD.toFixed(1)}%</td>
                  <td className="px-2 py-2 tabular-nums text-slate-300">{r.metrics.winRate.toFixed(0)}%</td>
                  <td className="px-2 py-2 tabular-nums text-slate-400">{r.metrics.trades}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRerun(r.id);
                      }}
                      disabled={rerunningId === r.id}
                      aria-label={`Rerun ${r.label}`}
                      className={`rounded-md border border-edge px-1.5 py-0.5 text-[12px] text-slate-400 transition hover:border-accent/50 hover:text-accent-2 ${
                        rerunningId === r.id ? "spin-once text-accent-2" : ""
                      }`}
                    >
                      ↻
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------- detail ----------

export function RunDetail({ run, onRerun, rerunning }: { run: BacktestRun; onRerun: () => void; rerunning: boolean }) {
  const m: RunMetrics = run.metrics;
  const pos = m.netPnl >= 0;
  return (
    <Panel
      title={run.label}
      icon={<>⟲</>}
      right={
        <button
          onClick={onRerun}
          disabled={rerunning}
          className="rounded-md border border-edge px-2.5 py-1 text-[11.5px] text-slate-300 transition hover:border-accent/50 hover:text-accent-2 disabled:opacity-60"
        >
          {rerunning ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border border-accent-2/40 border-t-accent-2" />
              rerunning…
            </span>
          ) : (
            "↻ Rerun"
          )}
        </button>
      }
      className="h-full"
    >
      <div className="space-y-4 p-3">
        <div>
          <div className="flex items-baseline justify-between px-1 pb-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500">Equity curve · normalized</span>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {run.equityCurve[0]} → {run.equityCurve[run.equityCurve.length - 1]}
            </span>
          </div>
          <div className="rounded-lg border border-edge bg-surface-2/30 px-1 pb-1 pt-2">
            <EquityArea values={run.equityCurve} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between px-1 pb-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500">Drawdown</span>
            <span className="font-mono text-[11px] tabular-nums text-amber">max {m.maxDD.toFixed(1)}%</span>
          </div>
          <div className="rounded-lg border border-edge bg-surface-2/30 px-1 pb-1 pt-2">
            <DrawdownArea values={run.drawdown} />
          </div>
        </div>

        {/* params grid */}
        <div className="grid grid-cols-4 gap-2 rounded-lg border border-edge bg-surface-2/25 p-3 font-mono text-[10.5px]">
          <div><div className="text-slate-600">lookback</div><div className="text-slate-200">{run.params.lookback}</div></div>
          <div><div className="text-slate-600">threshold</div><div className="text-slate-200">{run.params.threshold}σ</div></div>
          <div><div className="text-slate-600">max pos</div><div className="text-slate-200">{run.params.maxPos}</div></div>
          <div><div className="text-slate-600">risk/trade</div><div className="text-slate-200">{run.params.riskPct}%</div></div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MetricChip label="Net PnL" value={usd(m.netPnl)} tone={pos ? "pos" : "neg"} />
          <MetricChip label="Sharpe" value={m.sharpe.toFixed(2)} tone={m.sharpe >= 1.2 ? "pos" : "neu"} />
          <MetricChip label="Sortino" value={m.sortino.toFixed(2)} tone="neu" />
          <MetricChip label="Profit F." value={m.profitFactor.toFixed(2)} tone={m.profitFactor >= 1.2 ? "pos" : "neg"} />
          <MetricChip label="Win rate" value={m.winRate.toFixed(1)} unit="%" tone="neu" />
          <MetricChip label="Trades" value={String(m.trades)} tone="neu" />
          <MetricChip label="Max DD" value={m.maxDD.toFixed(1)} unit="%" tone="neg" />
          <MetricChip label="CAGR" value={m.cagr.toFixed(1)} unit="%" tone={m.cagr >= 0 ? "pos" : "neg"} />
        </div>

        <p className="px-1 text-[10.5px] leading-relaxed text-slate-600">
          {run.strategy} on {run.symbol} · {run.timeframe} bars over {run.rangeText}. Metrics include 10 bps taker
          fees; reruns jitter execution to bound overfit.
        </p>
      </div>
    </Panel>
  );
}

// ---------- V9: robustness (walk-forward + MC + sensitivity) + go-live gates ----------

import { walkForward, monteCarlo, sensitivity } from "../lib/backtests";
import { goLive, runToStrat, type Strat } from "../lib/lifecycle";
import { seedTickers } from "../lib/market";
import { Badge, Ring } from "./ui";

export function RobustnessPanel({ run }: { run: BacktestRun }) {
  const wf = walkForward(run);
  const mc = monteCarlo(run, 200);
  const grid = sensitivity(run);
  const decayPct = Math.max(0, Math.min(1, wf.decay)) * 100;
  return (
    <Panel
      title="Robustness"
      icon={<>∴</>}
      right={
        wf.overfit ? (
          <Badge tone="warn">OVERFIT · IS &gt; 2×OS</Badge>
        ) : (
          <Badge tone="ok">IS/OS within 2×</Badge>
        )
      }
      className="bg-surface-2/40"
    >
      <div className="space-y-3 p-3">
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-edge bg-surface-2/40 px-3 py-2">
            <Ring value={decayPct} size={52} tone={wf.overfit ? "var(--color-amber)" : "var(--color-long)"}>
              <span className="font-mono text-[12px] tabular-nums text-slate-100">{wf.decay.toFixed(2)}</span>
            </Ring>
            <span className="text-[9.5px] uppercase tracking-[0.1em] text-slate-500">OS/IS decay</span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-1.5">
            <div><div className="text-[9.5px] text-slate-500">IS Sharpe</div><div className="font-mono text-[13px] tabular-nums text-slate-200">{wf.isSharpe.toFixed(2)}</div></div>
            <div><div className="text-[9.5px] text-slate-500">OS Sharpe</div><div className={`font-mono text-[13px] tabular-nums ${wf.osSharpe >= wf.isSharpe * 0.5 ? "text-long" : "text-short"}`}>{wf.osSharpe.toFixed(2)}</div></div>
            <div><div className="text-[9.5px] text-slate-500">Fold</div><div className="font-mono text-[13px] tabular-nums text-slate-400">{wf.folds}</div></div>
            <div><div className="text-[9.5px] text-slate-500">p50 DD (MC)</div><div className="font-mono text-[13px] tabular-nums text-slate-300">{mc.p50.toFixed(1)}%</div></div>
            <div><div className="text-[9.5px] text-slate-500">p95 DD</div><div className="font-mono text-[13px] tabular-nums text-amber">{mc.p95.toFixed(1)}%</div></div>
            <div><div className="text-[9.5px] text-slate-500">p99 DD</div><div className="font-mono text-[13px] tabular-nums text-short">{mc.p99.toFixed(1)}%</div></div>
          </div>
        </div>
        <div className="rounded-lg border border-edge bg-surface-2/30 px-3 py-2">
          <span className="text-[11.5px] text-slate-300">
            Monte-Carlo ({mc.n} paths):{" "}
            <span className="font-mono text-amber">{mc.pLoss20.toFixed(0)}%</span> of paths draw down &gt; 20%
          </span>
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Sensitivity · threshold × lookback multipliers</span>
            <span className="font-mono text-[10px] text-slate-500">best @ {grid.best.x} / {grid.best.y} → {grid.best.sharpe.toFixed(2)}</span>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${grid.xs.length}, minmax(0,1fr))` }}>
            <div />
            {grid.xs.map((x) => (
              <div key={x} className="text-center font-mono text-[9px] text-slate-600">{x}×</div>
            ))}
            {grid.ys.map((y) => (
              <RowCells key={y} y={y} xs={grid.xs} yKey={y} grid={grid} />
            ))}
          </div>
        </div>
        <p className="text-[10.5px] leading-relaxed text-slate-600">
          Highlighted cells = flat region (≥70% of best) → robust to parameter drift. A spike with quiet neighbors is an
          overfit peak — do not ship it. Walkforward splits this curve {wf.folds}-way; MC resamples bars with this
          run&apos;s own returns.
        </p>
      </div>
    </Panel>
  );
}

function RowCells({ y, xs, grid, yKey }: { y: number; xs: number[]; yKey: number; grid: ReturnType<typeof sensitivity> }) {
  const cellsForY = xs.map((x) => grid.cells.find((c) => c.x === x && c.y === yKey)!);
  return (
    <>
      <div className="flex items-center justify-end pr-1.5 font-mono text-[9px] text-slate-600">{y}×</div>
      {cellsForY.map((c) => {
        const best = c.x === grid.best.x && c.y === grid.best.y;
        return (
          <div
            key={`${c.x}-${c.y}`}
            title={`×${c.x} ×${c.y} → sharpe ${c.sharpe.toFixed(2)}${c.robust ? " (robust)" : ""}`}
            className={[
              "flex h-7 items-center justify-center rounded border font-mono text-[9.5px] tabular-nums",
              c.robust ? "border-cyan/45 bg-cyan/15 text-cyan" : "border-edge/70 bg-surface-2/30 text-slate-500",
              best ? "ring-1 ring-cyan" : "",
            ].join(" ")}
          >
            {(c.sharpe >= 0 ? "" : "-") + Math.abs(c.sharpe).toFixed(1)}
          </div>
        );
      })}
    </>
  );
}

export function GoLivePanel({ run, onGoLive }: { run: BacktestRun; onGoLive?: (s: Strat) => void }) {
  const strat = runToStrat(run);
  const tick = seedTickers().find((t) => t.symbol === run.symbol);
  const report = goLive(strat, { symbol: run.symbol, history: tick?.history ?? [], riskOff: false });
  return (
    <Panel
      title="Go live gate"
      icon={<>⚑</>}
      right={report.ok ? <Badge tone="ok">GATES PASS</Badge> : <Badge tone="warn">GATES FAIL</Badge>}
      className="bg-surface-2/40"
    >
      <div className="space-y-2 p-3">
        {report.gates.map((g) => (
          <div key={g.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${g.pass ? "border-edge bg-surface-2/30" : "border-amber/40 bg-amber/[0.06]"}`}>
            <span className={`mt-0.5 text-[13px] ${g.pass ? "text-long" : "text-amber"}`}>{g.pass ? "✓" : "✕"}</span>
            <div>
              <div className="text-[12px] text-slate-200">{g.label}</div>
              <div className="font-mono text-[10.5px] text-slate-500">{g.detail}</div>
            </div>
          </div>
        ))}
        <div className={`rounded-lg border px-2.5 py-2 ${report.aiSignoff ? "border-cyan/40 bg-cyan/[0.05]" : "border-edge bg-surface-2/30"}`}>
          <div className="flex items-center gap-1.5">
            <Badge tone={report.aiSignoff ? "ai" : "muted"}>{report.aiSignoff ? "AI SIGNOFF" : "NO SIGNOFF"}</Badge>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">{report.line}</p>
        </div>
        <button
          disabled={!report.ok}
          onClick={() => onGoLive?.(strat)}
          className={`w-full rounded-lg border px-3 py-2 text-[12.5px] font-medium transition ${
            report.ok
              ? "border-long/50 bg-long/15 text-long hover:bg-long/25"
              : "cursor-not-allowed border-edge text-slate-600"
          }`}
        >
          {report.ok ? "Promote to live (paper → live)" : "Set risk params (stop/size/cap/corr) + pass gates"}
        </button>
        <p className="text-[10px] leading-relaxed text-slate-600">
          The gate is a function: risk ⊕ win ⊕ Sharpe ⊕ DD — or the V6 signoff for the metric triple. Killed models
          re-enter at paper, per /strategies lifecycle.
        </p>
      </div>
    </Panel>
  );
}
