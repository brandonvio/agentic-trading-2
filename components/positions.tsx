import { Badge, Panel, Ring } from "./ui";
import { usd } from "./panels";
import { meta } from "../lib/instruments";
import {
  fmtAge,
  fmtPx,
  fmtQty,
  type BookStats,
  type ClosedTrade,
  type Position,
  type PosAction,
  type SymbolRow,
} from "../lib/positions";

// ---------- atoms ----------

function SideChip({ side }: { side: Position["side"] }) {
  const long = side === "LONG";
  return (
    <span
      className={[
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ring-1",
        long
          ? "bg-long/10 text-long ring-long/35"
          : "bg-short/10 text-short ring-short/35",
      ].join(" ")}
    >
      {long ? "▲" : "▼"} {side}
    </span>
  );
}

function MiniBar({ hi, lo }: { hi: number; lo: number }) {
  const hi0 = Math.max(0, hi);
  const lo0 = Math.min(0, lo);
  const span = Math.max(1e-9, hi0 - lo0);
  const zeroX = ((0 - lo0) / span) * 100;
  const posW = (hi0 / span) * 100;
  const negW = (lo0 / span) * -100; // positive width for negative side
  return (
    <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-slate-800/70">
      <div className="absolute inset-y-0" style={{ left: `${zeroX}%`, width: "1px", background: "rgba(255,255,255,0.25)" }} />
      {hi0 > 0 && (
        <div
          className="absolute inset-y-0 bg-long/80"
          style={{ left: `${zeroX}%`, width: `${Math.min(posW, 100 - zeroX)}%` }}
        />
      )}
      {lo0 < 0 && (
        <div
          className="absolute inset-y-0 bg-short/80"
          style={{ left: `${zeroX - negW}%`, width: `${Math.min(negW, zeroX)}%` }}
        />
      )}
    </div>
  );
}

// ---------- KPI strip ----------

function KpiTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "long" | "short" | "accent" | "amber";
}) {
  const color = {
    neutral: "text-slate-100",
    long: "text-long",
    short: "text-short",
    accent: "text-accent-2",
    amber: "text-amber",
  }[tone];
  return (
    <div className="rounded-xl border border-edge bg-surface/60 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-[16px] font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function Kpis({ stats, interestUsd }: { stats: BookStats; interestUsd?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
      <KpiTile label="Equity" value={usd(stats.equity)} tone="accent" />
      <KpiTile label="Gross exp." value={usd(stats.grossExposure)} sub={`${stats.openCount} open`} />
      <KpiTile
        label="Net exp."
        value={usd(stats.netExposure)}
        sub="long − short"
        tone={stats.netExposure >= 0 ? "long" : "short"}
      />
      <KpiTile
        label="Unrealized"
        value={`${stats.unrealized >= 0 ? "+" : "−"}${usd(Math.abs(stats.unrealized))}`}
        sub={`avg ${stats.avgUnrealizedPct >= 0 ? "+" : ""}${stats.avgUnrealizedPct}%`}
        tone={stats.unrealized >= 0 ? "long" : "short"}
      />
      <KpiTile label="Realized" value={usd(stats.realizedTotal)} sub="session + base" />
      <KpiTile label="Margin used" value={usd(stats.marginUsed)} sub={`${stats.marginPct}% of equity`} tone="amber" />
      <KpiTile
        label="Worst"
        value={`${stats.worstPnl >= 0 ? "+" : "−"}${usd(Math.abs(stats.worstPnl))}`}
        sub={stats.worstSymbol}
        tone={stats.worstPnl >= 0 ? "long" : "short"}
      />
      <KpiTile
        label="Interest (M/M)"
        value={interestUsd != null && interestUsd > 0 ? `−${usd(interestUsd)}` : "—"}
        sub={stats.openCount > 0 ? "IB debit interest · TRADING" : "flat book"}
        tone="amber"
      />
    </div>
  );
}

// ---------- main table ----------

const CELL = "px-2.5 py-2";
const HEAD = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";

export function PositionsTable({
  positions,
  onAct,
}: {
  positions: Position[];
  onAct?: (id: string, a: PosAction) => void;
}) {
  return (
    <Panel
      title="Open positions"
      icon={<>◆</>}
      right={
        <span className="font-mono text-[11px] text-slate-500">
          {positions.length} open · long→bid / short→ask · ½-spread slippage
        </span>
      }
    >
      {positions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-[28px] text-long">✓</div>
          <p className="text-[13px] text-slate-400">
            Book is flat — all positions are realized. Watch the desk inject fresh risk from the signals feed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className={HEAD}>Instrument</th>
                <th className={HEAD}>Side</th>
                <th className={`${HEAD} text-right hidden md:table-cell`}>Qty</th>
                <th className={`${HEAD} text-right`}>Entry</th>
                <th className={`${HEAD} text-right`}>Mark · MTM</th>
                <th className={`${HEAD} text-right hidden lg:table-cell`}>Stop</th>
                <th className={`${HEAD} text-right hidden lg:table-cell`}>Target</th>
                <th className={`${HEAD} text-right`}>Unrl. P&L</th>
                <th className={`${HEAD} text-right hidden xl:table-cell`}>Margin</th>
                <th className={`${HEAD} text-right hidden xl:table-cell`}>Lev</th>
                <th className={`${HEAD} text-right hidden 2xl:table-cell`}>MFE / MAE</th>
                <th className={`${HEAD} text-right hidden 2xl:table-cell`}>Age</th>
                {onAct && <th className={`${HEAD} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const up = p.unrealizedPnl >= 0;
                const pct = (p.unrealizedPnl / (p.entryPx * p.qty)) * 100;
                return (
                  <tr key={p.id} className="border-b border-edge/50 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className={CELL}>
                      <div className="font-mono text-[12.5px] font-medium text-slate-100">{p.symbol}</div>
                      <div className="mt-0.5 text-[10.5px] text-slate-500">
                        {p.strategy} · {p.venue}
                      </div>
                    </td>
                    <td className={CELL}><SideChip side={p.side} /></td>
                    <td className={`${CELL} hidden md:table-cell font-mono text-right tabular-nums text-slate-300`}>{fmtQty(p.qty)}</td>
                    <td className={`${CELL} font-mono text-right tabular-nums text-slate-400`}>{fmtPx(p.entryPx)}</td>
                    <td className={`${CELL} font-mono text-right tabular-nums text-slate-100`}>
                      {(() => {
                        const half = (meta(p.symbol).spreadBps / 2e4); // decimal fraction, half the spread
                        const isLong = p.side === "LONG";
                        const marked = isLong ? p.markPx * (1 - half) : p.markPx * (1 + half);
                        const other = isLong ? p.markPx * (1 + half) : p.markPx * (1 - half);
                        return (
                          <>
                            {fmtPx(marked)}
                            <div className="text-[9.5px] font-normal tabular-nums text-slate-600">
                              {isLong ? "bid" : "ask"} mkt · {isLong ? "ask" : "bid"} {fmtPx(other)}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className={`${CELL} hidden lg:table-cell font-mono text-right tabular-nums text-short/80`}>{fmtPx(p.stopPx)}</td>
                    <td className={`${CELL} hidden lg:table-cell font-mono text-right tabular-nums text-long/80`}>{fmtPx(p.targetPx)}</td>
                    <td className={`${CELL} text-right`}>
                      <div className={`font-mono tabular-nums ${up ? "text-long" : "text-short"}`}>
                        {up ? "+" : "−"}{usd(Math.abs(p.unrealizedPnl))}
                      </div>
                      <div className={`font-mono text-[10.5px] tabular-nums ${up ? "text-long/70" : "text-short/70"}`}>
                        {up ? "+" : ""}{pct.toFixed(2)}%
                      </div>
                    </td>
                    <td className={`${CELL} hidden xl:table-cell font-mono text-right tabular-nums text-slate-400`}>{usd(p.marginUsed)}</td>
                    <td className={`${CELL} hidden xl:table-cell text-right`}>
                      <span className="font-mono text-[11px] text-slate-300">{p.leverage}×</span>
                    </td>
                    <td className={`${CELL} hidden 2xl:table-cell`}>
                      <div className="flex flex-col items-end gap-1">
                        <MiniBar hi={p.mfe} lo={p.mae} />
                        <span className="font-mono text-[9.5px] tabular-nums text-slate-600">
                          {usd(p.mfe)} / −{usd(Math.abs(p.mae))}
                        </span>
                      </div>
                    </td>
                    <td className={`${CELL} hidden 2xl:table-cell font-mono text-right text-[11px] text-slate-500`}>{fmtAge(p.openedAgoSec)}</td>
                    {onAct && (
                      <td className={`${CELL} text-right`}>
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => onAct(p.id, "half")}
                            title="Sell half at mark"
                            className="rounded-md border border-edge px-2 py-1 text-[11px] text-slate-300 transition hover:border-accent/50 hover:text-white"
                          >
                            ½ Sell
                          </button>
                          <button
                            onClick={() => onAct(p.id, "stop")}
                            title="Close at stop"
                            className="rounded-md border border-edge px-2 py-1 text-[11px] text-amber/90 transition hover:border-amber/50 hover:text-amber"
                          >
                            ⛔ Stop
                          </button>
                          <button
                            onClick={() => onAct(p.id, "close")}
                            title="Close fully at mark"
                            className="rounded-md border border-short/40 bg-short/10 px-2 py-1 text-[11px] font-medium text-short transition hover:bg-short/20"
                          >
                            ✕ Close
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------- realized log ----------

export function RealizedLog({ closes }: { closes: ClosedTrade[] }) {
  return (
    <Panel
      title="Realized trades"
      icon={<>⌁</>}
      right={<Badge tone={closes.length ? "ok" : "muted"}>{closes.length ? `${closes.length} in book` : "none yet"}</Badge>}
      className="h-full"
    >
      {closes.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-slate-500">
          No trades realized this session yet. Closes land here with P&L.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {closes.map((c) => {
            const up = c.pnl >= 0;
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={[
                      "inline-flex h-5 w-5 items-center justify-center rounded text-[11px]",
                      up ? "bg-long/12 text-long" : "bg-short/12 text-short",
                    ].join(" ")}
                  >
                    {up ? "▲" : "▼"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11.5px] text-slate-200">
                      {c.symbol} · {fmtQty(c.qty)} @ {fmtPx(c.px)}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {c.tsLabel} · {c.by === "desk" ? "desk order" : "auto"} · {c.strategy}
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 font-mono text-[11.5px] tabular-nums ${up ? "text-long" : "text-short"}`}>
                  {up ? "+" : "−"}{usd(Math.abs(c.pnl))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ---------- pnl by symbol ----------

export function PnlBySymbol({ rows }: { rows: SymbolRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <Panel title="P&L by symbol" icon={<>∑</>} className="h-full">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-slate-500">Book is flat — no attribution to show.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const pos = r.pnl >= 0;
            const w = Math.max(3, (Math.abs(r.pnl) / max) * 48);
            return (
              <li key={r.symbol} className="flex items-center gap-2.5">
                <div className="w-20 shrink-0 truncate font-mono text-[11.5px] text-slate-300">{r.symbol}</div>
                <div className="relative h-4 flex-1 rounded bg-slate-900/70">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
                  <div
                    className={pos ? "absolute inset-y-0.5 left-1/2 rounded-r bg-long/85" : "absolute inset-y-0.5 rounded-l bg-short/85"}
                    style={
                      pos
                        ? { width: `${w}%` }
                        : { right: "50%", width: `${w}%` }
                    }
                  />
                </div>
                <span className={`w-24 shrink-0 text-right font-mono text-[11.5px] tabular-nums ${pos ? "text-long" : "text-short"}`}>
                  {pos ? "+" : "−"}{usd(Math.abs(r.pnl))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ---------- exposure panel ----------

export function ExposurePanel({ stats }: { stats: BookStats }) {
  const gross = Math.max(1, stats.longExposure, stats.shortExposure);
  return (
    <Panel title="Exposure split" icon={<>◔</>} className="h-full">
      <div className="flex items-center gap-4">
        <Ring
          value={Math.min(100, stats.marginPct * 2)}
          size={92}
          tone={stats.marginPct > 25 ? "var(--short)" : stats.marginPct > 12 ? "var(--amber)" : "var(--long)"}
        >
          <div className="text-center">
            <div className="font-mono text-[15px] font-semibold text-slate-100 tabular-nums">{stats.marginPct}%</div>
            <div className="text-[8.5px] uppercase tracking-wider text-slate-500">margin</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-[10.5px]">
              <span className="text-slate-400 font-medium uppercase tracking-wide">Long</span>
              <span className="font-mono tabular-nums text-long">{usd(stats.longExposure)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
              <div className="h-full rounded-full bg-long/85" style={{ width: `${(stats.longExposure / gross) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[10.5px]">
              <span className="text-slate-400 font-medium uppercase tracking-wide">Short</span>
              <span className="font-mono tabular-nums text-short">{usd(stats.shortExposure)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
              <div className="h-full rounded-full bg-short/85" style={{ width: `${(stats.shortExposure / gross) * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-edge pt-2">
            <span className="text-[10.5px] uppercase tracking-wide text-slate-500">Net</span>
            <span className={`font-mono text-[12.5px] font-semibold tabular-nums ${stats.netExposure >= 0 ? "text-long" : "text-short"}`}>
              {stats.netExposure >= 0 ? "NET LONG" : "NET SHORT"} {usd(Math.abs(stats.netExposure))}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
