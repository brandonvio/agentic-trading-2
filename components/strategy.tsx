"use client";

import { Panel, Badge, LiveDot, Ring } from "./ui";
import { usd } from "./panels";
import { project, type Strategy } from "../lib/strategies";

type TileTone = "long" | "short" | "amber" | "neutral";

// ---------- small parts ----------

export function StatusPill({ status }: { status: Strategy["status"] }) {
  const map = {
    live: { cls: "bg-long/15 text-long ring-long/40", dot: true, label: "LIVE" },
    paused: { cls: "bg-amber/15 text-amber ring-amber/40", dot: false, label: "PAUSED" },
    backtest: { cls: "bg-cyan/15 text-cyan ring-cyan/40", dot: false, label: "BACKTEST" },
    halted: { cls: "bg-short/15 text-short ring-short/40", dot: false, label: "HALTED" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ring-1 ${map.cls}`}>
      {map.dot ? <LiveDot /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {map.label}
    </span>
  );
}

function BiasChip({ bias }: { bias: Strategy["bias"] }) {
  const m =
    bias === "long"
      ? { t: "LONG", c: "text-long bg-long/10 ring-long/30" }
      : bias === "short"
        ? { t: "SHORT", c: "text-short bg-short/10 ring-short/30" }
        : { t: "± BOTH", c: "text-cyan bg-cyan/10 ring-cyan/30" };
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider ring-1 ${m.c}`}>{m.t}</span>
  );
}

export function KpiTile({ label, value, tone, sub }: { label: string; value: string; tone?: TileTone; sub?: string }) {
  const c =
    tone === "long" ? "text-long" : tone === "short" ? "text-short" : tone === "amber" ? "text-amber" : "text-slate-100";
  return (
    <div className="rounded-lg border border-edge/80 bg-surface-2/40 px-2.5 py-2">
      <div className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-[13.5px] font-semibold ${c}`}>{value}</div>
      {sub ? <div className="text-[9.5px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** Normalized SVG area chart of a strategy's cumulative P&L curve. */
export function EquityArea({ points, down }: { points: number[]; down: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const P = (i: number, v: number) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((v - min) / span) * 96 - 2; // 2% padding top/bottom
    return [x, y] as const;
  };
  const line = points.map((v, i) => `${P(i, v)[0].toFixed(2)},${P(i, v)[1].toFixed(2)}`).join(" ");
  const area = `0,100 ${line} 100,100`;
  const gid = down ? "eqd" : "eu";
  const col = down ? "#f43f5e" : "#10b981";
  const zeroY = 100 - ((0 - min) / span) * 96 - 2;
  const showZero = min < 0 && max > 0;
  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="0.28" />
          <stop offset="1" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(148,163,184,0.10)" strokeWidth="0.4" />
      ))}
      {showZero && (
        <line x1="0" x2="100" y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.35)" strokeWidth="0.5" strokeDasharray="2 2" />
      )}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={col} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
      <circle cx="100" cy={P(points.length - 1, points[points.length - 1])[1]} r="1.3" fill={col} />
    </svg>
  );
}

export function ConfidenceBar({ value, label = "Model confidence" }: { value: number; label?: string }) {
  const tone = value >= 78 ? "bg-long" : value >= 60 ? "bg-amber" : "bg-short";
  return (
    <div>
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-300">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%`, transition: "width .7s" }} />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="font-mono text-[11.5px] text-slate-100">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-accent"
      />
    </label>
  );
}

// ---------- main card ----------

export function StrategyCard({
  s,
  selected,
  onSelect,
  onToggleStatus,
  onParam,
}: {
  s: Strategy;
  selected: boolean;
  onSelect: () => void;
  onToggleStatus: () => void;
  onParam: (patch: Partial<Strategy>) => void;
}) {
  const proj = project(s);
  const live = s.status === "live";
  return (
    <div
      className={`group rounded-xl border bg-surface/80 backdrop-blur transition-all ${
        selected
          ? "border-accent/60 shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_16px_40px_-20px_rgba(99,102,241,0.35)]"
          : "border-edge hover:border-edge-2"
      }`}
    >
      {/* header */}
      <div className="cursor-pointer px-4 pt-3.5" onClick={onSelect}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14.5px] font-semibold tracking-tight text-slate-50">{s.label}</h3>
          <span className="font-mono text-[10.5px] text-slate-500">{s.version}</span>
          <StatusPill status={s.status} />
          <BiasChip bias={s.bias} />
          <span className="ml-auto text-[10.5px] text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            {selected ? "hide detail ↓" : "inspect →"}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-slate-500">{s.tagline}</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 p-4 md:grid-cols-[1fr_236px]">
        {/* left: performance */}
        <div className="min-w-0">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Session P&L</div>
              <div className={`font-mono text-xl font-semibold ${s.pnl >= 0 ? "text-long" : "text-short"}`}>
                {s.pnl >= 0 ? "+" : "−"}
                {usd(Math.abs(s.pnl))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">30d</div>
              <div className={`font-mono text-[12.5px] ${s.pnl30d >= 0 ? "text-long" : "text-short"}`}>
                {s.pnl30d >= 0 ? "+" : "−"}
                {usd(Math.abs(s.pnl30d))}
              </div>
            </div>
          </div>
          <div className="relative mt-2 h-24">
            <EquityArea points={s.equity} down={s.pnl < 0} />
          </div>
          <div className="mt-0.5 flex justify-between text-[9.5px] text-slate-600">
            <span>−14d</span>
            <span>cumulative session P&L · {s.trades} trades · avg hold {s.avgHold}</span>
            <span>now</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            <KpiTile label="Sharpe" value={s.sharpe.toFixed(2)} />
            <KpiTile label="Sortino" value={s.sortino.toFixed(2)} />
            <KpiTile
              label="Win rate"
              value={`${s.winRate}%`}
              sub={`${Math.round((s.winRate / 100) * s.trades)}/${s.trades}`}
            />
            <KpiTile label="Max DD" value={`−${s.maxDD}%`} tone="amber" />
            <KpiTile label="Exposure" value={`${s.exposure}%`} sub="of book" />
          </div>

          {/* allocations */}
          <div className="mt-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">Exposure split</div>
            <div className="flex gap-1.5">
              {s.symbols.map((e) => (
                <div key={e.symbol} className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-[9.5px] text-slate-400">
                    <span className="truncate font-mono">{e.symbol}</span>
                    <span className="font-mono">{e.weight}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/70">
                    <div
                      className={`h-full rounded-full ${e.pnl >= 0 ? "bg-long/80" : "bg-short/80"}`}
                      style={{ width: `${Math.min(100, e.weight * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right: risk controls */}
        <div className="flex flex-col gap-3 rounded-lg border border-edge/80 bg-surface-2/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Risk controls
            </span>
            <span className="rounded bg-slate-800/70 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400">
              {s.engine.split("·")[0].trim().slice(0, 18)}
            </span>
          </div>

          {live ? (
            <div className="space-y-2.5">
              <Slider label="Position sizing" value={s.riskScale} min={10} max={150} step={5} suffix="%" onChange={(v) => onParam({ riskScale: v })} />
              <Slider label="Stop-loss" value={s.stopLoss} min={1} max={15} step={0.5} suffix="%" onChange={(v) => onParam({ stopLoss: v })} />
              <Slider label="Max leverage" value={s.maxLeverage} min={1} max={5} step={0.1} suffix="×" onChange={(v) => onParam({ maxLeverage: v })} />
              <Slider label="Max positions" value={s.maxPositions} min={1} max={20} step={1} onChange={(v) => onParam({ maxPositions: v })} />
            </div>
          ) : (
            <div className="rounded-md border border-amber/30 bg-amber/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber/90">
              Engine paused — risk controls locked. Resume the strategy to adjust live parameters.
            </div>
          )}

          <div className="border-t border-edge/80 pt-2.5">
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">Modeled envelope</div>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-slate-400">Est. VaR 95 (day)</dt>
                <dd className="font-mono text-slate-100">{usd(proj.estVar)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Effective leverage</dt>
                <dd className="font-mono text-slate-100">{proj.effLeverage}×</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Modeled max DD</dt>
                <dd className="font-mono text-amber">−{proj.worstDD}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Capital allocated</dt>
                <dd className="font-mono text-slate-100">{usd(proj.capitalInUse)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-auto flex gap-2">
            <button
              onClick={onToggleStatus}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold ring-1 transition-colors ",
                live
                  ? "bg-amber/15 text-amber ring-amber/40 hover:bg-amber/25"
                  : "bg-long/15 text-long ring-long/40 hover:bg-long/25",
              ].join(" ")}
            >
              {live ? "⏸ Pause engine" : "▶ Resume engine"}
            </button>
            <button
              onClick={onSelect}
              className="rounded-lg border border-edge bg-surface px-3 py-2 text-[12px] font-medium text-slate-300 transition-colors hover:border-accent/50 hover:text-accent-2"
            >
              Inspect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- page-level bands ----------

export function AttributionPanel({ list }: { list: Strategy[] }) {
  const max = Math.max(...list.map((s) => Math.abs(s.pnl30d)), 1);
  return (
    <Panel
      title="30d P&L · attribution"
      right={
        <Badge tone="long">
          {usd(list.reduce((a, s) => a + s.pnl30d, 0))} total
        </Badge>
      }
    >
      <div className="flex flex-col gap-2.5">
        {list.map((s) => {
          const w = Math.max(4, Math.round((Math.abs(s.pnl30d) / max) * 100));
          const share = Math.round(Math.abs(s.pnl30d) / list.reduce((a, x) => a + Math.abs(x.pnl30d), 0));
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-32 truncate text-[11.5px] text-slate-300">{s.label}</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                  s.status === "live" ? "text-long" : "text-amber"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.status === "live" ? "bg-long" : "bg-amber"}`} />
                {s.status}
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800/60">
                <div
                  className={`h-full rounded-full ${s.pnl30d >= 0 ? "bg-gradient-to-r from-long/40 to-long" : "bg-gradient-to-r from-short/40 to-short"}`}
                  style={{ width: `${w}%` }}
                />
              </div>
              <span className="w-20 text-right font-mono text-[11.5px] text-slate-200">
                {s.pnl30d >= 0 ? "+" : "−"}
                {usd(Math.abs(s.pnl30d))}
              </span>
              <span className="w-10 text-right font-mono text-[10.5px] text-slate-500">{share}%</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function FleetPanel({ list, onOpen }: { list: Strategy[]; onOpen: (id: string) => void }) {
  return (
    <Panel title="Fleet · engine status" right={<span className="text-[10.5px] text-slate-500">{list.length} registered</span>}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <th className="px-2 py-2 font-medium">Strategy</th>
            <th className="hidden px-2 font-medium sm:table-cell">Engine</th>
            <th className="hidden px-2 font-medium md:table-cell">Signals · 24h</th>
            <th className="px-2 font-medium">Confidence</th>
            <th className="px-2" />
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id} className="border-t border-edge/70 text-[12px] transition-colors hover:bg-white/4">
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.status === "live" ? "bg-long" : s.status === "paused" ? "bg-amber" : "bg-short"}`} />
                  <span className="text-slate-200">{s.label}</span>
                  <span className="hidden font-mono text-[10px] text-slate-600 lg:inline">{s.version}</span>
                </div>
              </td>
              <td className="hidden px-2 font-mono text-[11px] text-slate-400 sm:table-cell">{s.engine}</td>
              <td className="hidden px-2 font-mono text-slate-300 md:table-cell">
                {s.signalsToday.toLocaleString()}
                <span className="text-slate-600"> · {s.riskScale}% sizing</span>
              </td>
              <td className="px-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${s.confidence >= 78 ? "bg-long" : s.confidence >= 60 ? "bg-amber" : "bg-short"}`}
                      style={{ width: `${s.confidence}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{s.confidence}</span>
                </div>
              </td>
              <td className="px-2 text-right">
                <button
                  onClick={() => onOpen(s.id)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-accent-2 opacity-70 transition hover:bg-accent/10 hover:opacity-100"
                >
                  manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function InspectorPanel({ s, onClose, onToggleStatus }: { s: Strategy; onClose: () => void; onToggleStatus: () => void }) {
  const proj = project(s);
  return (
    <div className="rounded-xl border border-accent/40 bg-surface/80 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-edge/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-2">Inspector</span>
          <span className="text-[13px] font-semibold text-slate-100">{s.label}</span>
          <span className="font-mono text-[10.5px] text-slate-500">{s.version}</span>
          <StatusPill status={s.status} />
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
        >
          ✕ close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        {/* thesis + params */}
        <div className="lg:col-span-5">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Thesis & model</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">{s.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.universe.map((u) => (
              <span key={u} className="rounded-md bg-slate-800/60 px-2 py-0.5 font-mono text-[10.5px] text-slate-300">
                {u}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Strategy parameters</div>
            <table className="w-full border-t border-edge/70 text-[11.5px]">
              <tbody>
                {s.params.map((p) => (
                  <tr key={p.name} className="border-b border-edge/50">
                    <td className="w-32 py-1.5 pr-3 align-top text-slate-400">{p.name}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-200">{p.value}</td>
                    <td className="hidden py-1.5 text-[10.5px] text-slate-600 xl:table-cell">{p.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* attribution detail */}
        <div className="lg:col-span-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Symbol attribution · session</div>
          <div className="mt-2 flex flex-col gap-2">
            {s.symbols.map((e) => (
              <div key={e.symbol} className="rounded-lg border border-edge/70 bg-surface-2/40 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-slate-100">{e.symbol}</span>
                  <span className={`font-mono text-[12px] ${e.pnl >= 0 ? "text-long" : "text-short"}`}>
                    {e.pnl >= 0 ? "+" : "−"}
                    {usd(Math.abs(e.pnl))}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800/70">
                    <div
                      className={`h-full ${e.pnl >= 0 ? "bg-long/80" : "bg-short/80"}`}
                      style={{ width: `${Math.min(100, e.weight * 2.2)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{e.weight}% wt</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-edge/70 bg-surface-2/40 px-2.5 py-2">
              <div className="text-[9.5px] uppercase text-slate-500">Trades 30d</div>
              <div className="mt-0.5 font-mono text-[13px] text-slate-100">{s.trades.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-edge/70 bg-surface-2/40 px-2.5 py-2">
              <div className="text-[9.5px] uppercase text-slate-500">Avg hold</div>
              <div className="mt-0.5 font-mono text-[13px] text-slate-100">{s.avgHold}</div>
            </div>
            <div className="rounded-lg border border-edge/70 bg-surface-2/40 px-2.5 py-2">
              <div className="text-[9.5px] uppercase text-slate-500">Signals 24h</div>
              <div className="mt-0.5 font-mono text-[13px] text-slate-100">{s.signalsToday.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* posture / risk */}
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Posture</span>
            <BiasChip bias={s.bias} />
          </div>
          <div className="mx-auto my-1 w-24">
            <Ring
              tone={s.status === "live" ? "var(--color-long)" : "var(--color-amber)"}
              value={Math.round((s.allocation / 100) * 82)}
            >
              <div className="text-[13px] font-bold text-slate-50">{s.allocation}%</div>
            </Ring>
          </div>
          <dl className="space-y-1.5 text-[11.5px]">
            {[
              ["Risk tier", s.riskTier === "high" ? "high" : s.riskTier],
              ["Base VaR 95", usd(s.baseVaR)],
              ["Sizing", `${s.riskScale}%`],
              ["Stop-loss", `${s.stopLoss}%`],
              ["Ceiling", `${s.maxLeverage}× · ${s.maxPositions} pos`],
              ["Modeled DD", `−${proj.worstDD}%`],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-mono text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <ConfidenceBar value={s.confidence} />
          </div>
          <button
            onClick={onToggleStatus}
            className={[
              "mt-3 w-full rounded-lg px-3 py-2 text-[12px] font-semibold ring-1 transition-colors",
              s.status === "live"
                ? "bg-amber/15 text-amber ring-amber/40 hover:bg-amber/25"
                : "bg-long/15 text-long ring-long/40 hover:bg-long/25",
            ].join(" ")}
          >
            {s.status === "live" ? "⏸ Pause this engine" : "▶ Resume this engine"}
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            Last signal · <span className="font-mono text-slate-400">{s.lastSignal}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function BookKpi({ k }: { k: { live: number; total: number; pnl: number; pnl30d: number; sharpe: number; winRate: number; trades: number; exposure: number } }) {
  const items = [
    { label: "Strategies live", value: `${k.live}/${k.total}`, sub: (k.total - k.live) + " paused", tone: "text-slate-50" },
    { label: "Session P&L", value: (k.pnl >= 0 ? "+" : "−") + usd(Math.abs(k.pnl)), tone: k.pnl >= 0 ? "text-long" : "text-short" },
    { label: "30d P&L", value: (k.pnl30d >= 0 ? "+" : "−") + usd(Math.abs(k.pnl30d)), tone: k.pnl30d >= 0 ? "text-long" : "text-short" },
    { label: "Blended Sharpe", value: k.sharpe.toFixed(2), tone: "text-slate-50" },
    { label: "Avg win rate", value: k.winRate + "%", tone: "text-slate-50" },
    { label: "Book exposure", value: k.exposure + "%", sub: `${usd(k.exposure * 10)} in use`, tone: "text-slate-50" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-edge bg-surface/80 px-3.5 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">{i.label}</div>
          <div className={`mt-1 font-mono text-lg font-semibold ${i.tone}`}>{i.value}</div>
          {i.sub ? <div className="mt-0.5 text-[10.5px] text-slate-500">{i.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
