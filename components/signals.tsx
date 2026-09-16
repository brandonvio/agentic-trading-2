"use client";

import { Panel, LiveDot } from "./ui";
import { usd } from "./panels";
import {
  fmtHold,
  type EngineStat,
  type FeedStats,
  type SignalAction,
  type SignalStatus,
  type TradedSignal,
} from "../lib/signals";

// ---------- badges ----------

export function SideBadge({ side }: { side: "LONG" | "SHORT" }) {
  const cls =
    side === "LONG"
      ? "text-long bg-long/12 ring-long/35"
      : "text-short bg-short/12 ring-short/35";
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ring-1 ${cls}`}>
      {side === "LONG" ? "▲ LONG" : "▼ SHORT"}
    </span>
  );
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  const map = {
    ACTIVE: { cls: "text-accent-2 bg-accent/12 ring-accent/40", live: true },
    FILLED: { cls: "text-amber bg-amber/12 ring-amber/40" },
    CLOSED: { cls: "text-long bg-long/12 ring-long/35" },
    STOPPED: { cls: "text-short bg-short/12 ring-short/35" },
    REJECTED: { cls: "text-slate-400 bg-slate-700/40 ring-slate-600/50" },
    EXPIRED: { cls: "text-slate-400 bg-slate-500/10 ring-slate-500/40" },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ring-1 ${map.cls}`}
    >
      {map.live && <LiveDot color="var(--color-accent)" />}
      {status}
    </span>
  );
}

function ConfBar({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-accent" : value >= 60 ? "bg-cyan" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800/80">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 font-mono text-[11px] text-slate-300">{value}</span>
    </div>
  );
}

function Money({ v }: { v: number | null }) {
  if (v == null) return <span className="text-slate-600">·</span>;
  const cls = v > 0 ? "text-long" : v < 0 ? "text-short" : "text-slate-400";
  return (
    <span className={`font-mono tabular-nums ${cls}`}>
      {v > 0 ? "+" : v < 0 ? "−" : ""}
      {usd(Math.abs(v))}
    </span>
  );
}

// ---------- KPI strip ----------

export function FeedKpis({ stats, feedSize }: { stats: FeedStats; feedSize: number }) {
  const items: { label: string; value: string; cls?: string }[] = [
    { label: "Signals in feed", value: String(feedSize) },
    { label: "Open", value: String(stats.open), cls: "text-accent-2" },
    { label: "Executed", value: String(stats.closed + stats.stopped + stats.expire) },
    { label: "Hit rate", value: `${stats.hitRate}%`, cls: stats.hitRate >= 60 ? "text-long" : "text-amber" },
    { label: "Fill rate", value: `${stats.fillRate}%` },
    { label: "Avg edge", value: `${stats.avgEdge} bp`, cls: "text-cyan" },
    {
      label: "Realized P&L",
      value: `${stats.realized >= 0 ? "+" : "−"}${usd(Math.abs(stats.realized))}`,
      cls: stats.realized >= 0 ? "text-long" : "text-short",
    },
    { label: "Open notional", value: usd(stats.openNotional) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-edge bg-surface/80 px-3.5 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.13em] text-slate-500">{i.label}</div>
          <div className={`mt-1 font-mono text-[15px] font-semibold ${i.cls ?? "text-slate-100"}`}>
            {i.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- main feed table ----------

export function SignalFeed({
  signals,
  selectedId,
  onSelect,
}: {
  signals: TradedSignal[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Panel
      title="Signal feed · live"
      icon={
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 14l4-6 4 3 4-7 4 5" />
        </svg>
      }
      right={<span className="font-mono text-[11px] text-slate-500">{signals.length} signals · auto-updating</span>}
    >
      <div className="scroll-thin -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-slate-500">
              <th className="px-2 pb-2.5 font-medium">Time</th>
              <th className="px-2 pb-2.5 font-medium">Instrument</th>
              <th className="px-2 pb-2.5 font-medium">Side</th>
              <th className="px-2 pb-2.5 font-medium">Engine</th>
              <th className="px-2 pb-2.5 text-right font-medium">Entry</th>
              <th className="px-2 pb-2.5 text-right font-medium">Target</th>
              <th className="px-2 pb-2.5 text-right font-muted">Stop</th>
              <th className="px-2 pb-2.5 text-right font-medium">Size</th>
              <th className="px-2 pb-2.5 text-right font-medium">Edge</th>
              <th className="px-2 pb-2.5 font-medium">Conf</th>
              <th className="px-2 pb-2.5 text-right font-medium">P&L</th>
              <th className="px-2 pb-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const sel = s.id === selectedId;
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(sel ? null : s.id)}
                  className={[
                    "cursor-pointer border-t border-edge/60 transition-colors",
                    sel ? "bg-accent/8" : "hover:bg-white/4",
                  ].join(" ")}
                >
                  <td className="px-2 py-2 font-mono text-[11.5px] text-slate-500">{s.time}</td>
                  <td className="px-2 py-2">
                    <div className="font-mono text-[12.5px] font-semibold text-slate-100">{s.symbol}</div>
                    <div className="text-[10px] text-slate-500">{s.venue}</div>
                  </td>
                  <td className="px-2 py-2"><SideBadge side={s.side} /></td>
                  <td className="px-2 py-2 text-[11.5px] text-slate-300">{s.engine}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-200">{s.entry.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-400">{s.target.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-500">{s.stop.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-300">{usd(s.sizeUsd)}</td>
                  <td className={`px-2 py-2 text-right font-mono tabular-nums ${s.edgeBps >= 20 ? "text-cyan" : "text-slate-400"}`}>
                    {s.edgeBps} bp
                  </td>
                  <td className="px-2 py-2"><ConfBar value={s.confidence} /></td>
                  <td className="px-2 py-2 text-right text-[12.5px]">
                    <Money v={s.pnlUsd} />
                    {s.status === "FILLED" ? (
                      <div className="text-[10px] text-slate-600">{fmtHold(s.holdMin)} open</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2"><StatusBadge status={s.status} /></td>
                </tr>
              );
            })}
            {signals.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-[13px] text-slate-500">
                  No signals match this filter right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------- detail panel ----------

function FactorRow({ name, score }: { name: string; score: number }) {
  const pos = score >= 0;
  const w = Math.min(50, Math.abs(score) / 2);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-[11px] text-slate-400">{name}</span>
      <div className="relative h-1.5 min-w-0 flex-1 rounded-full bg-slate-800/70">
        <div className="absolute left-1/2 top-[-2px] h-2.5 w-px bg-slate-600/70" />
        <div
          className={`absolute top-0 h-full rounded-full ${pos ? "bg-long/80" : "bg-short/80"}`}
          style={pos ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
        />
      </div>
      <span className={`w-9 shrink-0 text-right font-mono text-[11px] ${pos ? "text-long" : "text-short"}`}>
        {pos ? "+" : "−"}
        {Math.abs(score)}
      </span>
    </div>
  );
}

function Ladder({ s }: { s: TradedSignal }) {
  const lo = Math.min(s.entry, s.stop);
  const hi = Math.max(s.target);
  const span = Math.max(1e-9, hi - lo);
  const pct = (v: number) => ((v - lo) / span) * 100;
  const dir = s.side === "LONG";
  const rows = [
    { label: "target", v: s.target, cls: "text-long", bar: "bg-long/25" },
    { label: "entry", v: s.entry, cls: "text-slate-200", bar: "bg-accent/25" },
    { label: "stop", v: s.stop, cls: "text-short", bar: "bg-short/25" },
  ];
  void dir;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className={`w-12 text-[10.5px] ${r.cls}`}>{r.label}</span>
          <div className="relative h-1.5 min-w-0 flex-1 rounded-full bg-slate-800/60">
            <div
              className={`absolute h-full rounded-full ${r.bar}`}
              style={{ left: `${pct(lo)}%`, width: `${Math.max(2, Math.abs(pct(r.v) - pct(lo)))}%` }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950"
              style={{ left: `${pct(r.v)}%`, background: r.label === "target" ? "var(--color-long)" : r.label === "stop" ? "var(--color-short)" : "var(--color-accent)" }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-[11px] text-slate-300">
            {r.v.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

const ACTION: Record<string, { label: string; danger?: boolean }[]> = {
  ACTIVE: [
    { label: "⚡ Fill now" },
    { label: "✕ Cancel", danger: true },
  ],
  FILLED: [{ label: "⏹ Close at market" }],
};

export function SignalDetail({
  s,
  onAction,
  onClose,
}: {
  s: TradedSignal;
  onAction: (a: SignalAction) => void;
  onClose: () => void;
}) {
  const actions = ACTION[s.status] ?? [];
  return (
    <div className="rounded-xl border border-edge bg-surface/80 backdrop-blur px-4 py-3.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_40px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[15px] font-semibold text-slate-50">{s.symbol}</span>
          <SideBadge side={s.side} />
          <StatusBadge status={s.status} />
        </div>
        <button
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>{s.engine}</span>
        <span className="font-mono">{s.venue}</span>
        <span className="font-mono">{s.time}</span>
        <span className="font-mono">notional {usd(s.sizeUsd)}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            Order structure
          </div>
          <Ladder s={s} />
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["edge", `${s.edgeBps} bp`],
              ["confidence", `${s.confidence}%`],
              ["risk/size", s.sizeUsd > 0 ? "sized" : "·"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-edge/70 bg-surface-2/40 px-2.5 py-2">
                <dt className="text-[9.5px] uppercase text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-mono text-[12.5px] text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            Factor readout <span className="text-slate-600">· signed to signal</span>
          </div>
          <div className="space-y-2">
            {s.factors.map((f, i) => (
              <FactorRow key={f.name + i} name={f.name} score={f.score} />
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-amber/25 bg-amber/8 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber/80">
              Kill conditions
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-amber/70">
              {s.kills.map((k, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-amber/60">✕</span> {k}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-edge/70 pt-3">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => onAction(a.label.includes("Cancel") ? "cancel" : a.label.includes("Close") ? "close" : "fill")}
              className={[
                "rounded-lg px-3.5 py-2 text-[12px] font-semibold ring-1 transition-colors ",
                a.danger
                  ? "bg-short/12 text-short ring-short/40 hover:bg-short/20"
                  : "bg-long/12 text-long ring-long/40 hover:bg-long/20",
              ].join(" ")}
            >
              {a.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[10.5px] text-slate-600">
            Actions route through the execution gate · simulated
          </span>
        </div>
      )}
      {s.pnlUsd != null && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-edge/70 bg-surface-2/40 px-3 py-2">
          <span className="text-[11.5px] text-slate-400">Realized P&L</span>
          <span className={`font-mono text-[14px] font-semibold ${s.pnlUsd >= 0 ? "text-long" : "text-short"}`}>
            {s.pnlUsd >= 0 ? "+" : "−"}
            {usd(Math.abs(s.pnlUsd))}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- engine stats ----------

export function EngineStats({ rows }: { rows: EngineStat[] }) {
  const best = rows.length
    ? rows.reduce((a, b) => (b.realized > a.realized ? b : a))
    : null;
  return (
    <Panel
      title="Engine performance"
      right={<span className="font-mono text-[11px] text-slate-500">rolling 24h</span>}
    >
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-slate-500">
              <th className="px-2 pb-2.5 font-medium">Engine</th>
              <th className="px-2 pb-2.5 text-right font-medium">Signals</th>
              <th className="px-2 pb-2.5 text-right font-medium">Executed</th>
              <th className="px-2 pb-2.5 font-medium">Win rate</th>
              <th className="px-2 pb-2.5 text-right font-medium">Avg edge</th>
              <th className="px-2 pb-2.5 text-right font-medium">Realized</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.engineId} className="border-t border-edge/60">
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${best?.engineId === r.engineId ? "bg-accent" : "bg-slate-600"}`} />
                    <span className="text-slate-200">{r.label}</span>
                    {best?.engineId === r.engineId && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-2">
                        top
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-300">{r.signals}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-400">{r.closed}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800/70">
                      <div
                        className={`h-full rounded-full ${r.wr >= 55 ? "bg-long" : "bg-amber"}`}
                        style={{ width: `${r.wr}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{r.closed ? `${r.wr}%` : "·"}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-300">{r.avgEdge} bp</td>
                <td className={`px-2 py-2.5 text-right font-mono tabular-nums font-semibold ${r.realized >= 0 ? "text-long" : "text-short"}`}>
                  {r.realized >= 0 ? "+" : "−"}
                  {usd(Math.abs(r.realized))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
