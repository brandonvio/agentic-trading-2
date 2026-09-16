import { Panel, LiveDot } from "./ui";
import { usd } from "./panels";
import {
  type BookStats,
  type Fill,
  type Order,
  type VenueRow,
  fmtAge,
  fmtPx,
  fmtQty,
  isCrypto,
} from "../lib/orders";

// ---------- atoms ----------

const TYPE_STYLES: Record<Order["type"], string> = {
  LIMIT: "text-accent-2 bg-accent/12 ring-accent/30",
  STOP: "text-amber bg-amber/12 ring-amber/35",
  MARKET: "text-cyan bg-cyan/12 ring-cyan/35",
};

export function TypeChip({ type }: { type: Order["type"] }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ring-1 ${TYPE_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

const STATUS_STYLES: Record<Order["status"], string> = {
  OPEN: "text-cyan bg-cyan/10 ring-cyan/35",
  PARTIAL: "text-amber bg-amber/10 ring-amber/35",
  FILLED: "text-long bg-long/10 ring-long/35",
  CANCELED: "text-short bg-short/10 ring-short/35",
  EXPIRED: "text-slate-400 bg-white/5 ring-white/15",
};

export function OrderBadge({ status }: { status: Order["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ring-1 ${STATUS_STYLES[status]}`}
    >
      {status === "OPEN" && <LiveDot color="var(--cyan)" />}
      {status.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}

export function FillBar({ filled, qty }: { filled: number; qty: number }) {
  const pct = qty ? Math.min(100, Math.round((filled / qty) * 100)) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-long" : pct > 0 ? "bg-amber" : "bg-transparent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10.5px] tabular-nums text-slate-400">{pct}%</span>
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
  tone?: "neutral" | "long" | "short" | "accent" | "amber" | "cyan";
}) {
  const colors = {
    neutral: "text-slate-100",
    long: "text-long",
    short: "text-short",
    accent: "text-accent-2",
    amber: "text-amber",
    cyan: "text-cyan",
  } as const;
  return (
    <div className="rounded-xl border border-edge bg-surface/80 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular-nums ${colors[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function Kpis({ stats }: { stats: BookStats }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
      <KpiTile label="Open orders" value={String(stats.open)} sub={`${stats.partial} partial`} tone="cyan" />
      <KpiTile label="Open notional" value={usd(stats.openNotional)} tone="accent" />
      <KpiTile label="Filled today" value={String(stats.filled)} sub={`${stats.cancelled} cancel · ${stats.expired} expired`} tone="long" />
      <KpiTile label="Fill ratio" value={`${stats.fillRatio}%`} tone={stats.fillRatio >= 50 ? "long" : "neutral"} />
      <KpiTile label="Avg slippage" value={`${stats.slippageBps} bps`} tone={stats.slippageBps <= 3 ? "long" : "amber"} />
      <KpiTile label="Fees paid" value={usd(stats.fees)} sub="8 bps effective" />
      <KpiTile label="Open book risk" value={usd(stats.openRisk)} sub="Σ stop distance × qty" tone="amber" />
      <KpiTile label="Avg age" value={fmtAge(stats.avgAgeSec)} sub="open orders" tone="neutral" />
    </div>
  );
}

// ---------- open book ----------

export function OpenBook({
  orders,
  onAct,
}: {
  orders: Order[];
  onAct: (id: string, action: "cancel" | "execute" | "reduce") => void;
}) {
  return (
    <Panel
      title="Open book"
      accent
      right={
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>{orders.length} on desk</span>
          <LiveDot color="var(--cyan)" />
          live
        </div>
      }
    >
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-medium">Inst</th>
              <th className="px-3 py-2 font-medium">Side</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Venue</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Filled</th>
              <th className="px-3 py-2 text-right font-medium">Avg px</th>
              <th className="px-3 py-2 text-right font-medium">Limit / trig</th>
              <th className="px-3 py-2 font-medium">TIF</th>
              <th className="px-3 py-2 text-right font-medium">Risk</th>
              <th className="px-3 py-2 text-right font-medium">Age</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Desk action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-[13px] text-slate-500">
                  No orders match this filter.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const active = o.status === "OPEN" || o.status === "PARTIAL";
              return (
                <tr
                  key={o.id}
                  className="border-b border-edge/60 text-[12.5px] transition-colors last:border-0 hover:bg-white/[0.025]"
                  style={!active ? { opacity: 0.55 } : undefined}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-100">{o.symbol}</span>
                      {o.reduceOnly && (
                        <span className="rounded bg-white/5 px-1 text-[9px] font-semibold tracking-wider text-slate-500 ring-1 ring-white/10">
                          REDUCE
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {o.ref} · {o.strategy}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-mono text-[11px] font-bold ${o.side === "BUY" ? "text-long" : "text-short"}`}
                    >
                      {o.side}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <TypeChip type={o.type} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{o.venue}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-200">
                    {fmtQty(isCrypto(o.symbol), o.qty)}
                  </td>
                  <td className="px-3 py-2">
                    <FillBar filled={o.filledQty} qty={o.qty} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-200">
                    {o.avgPx > 0 ? fmtPx(o.avgPx) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">
                    {o.limitPx != null ? (
                      <span className="text-accent-2">{fmtPx(o.limitPx)}</span>
                    ) : o.stopPx != null ? (
                      <span className="text-amber">{fmtPx(o.stopPx)}</span>
                    ) : (
                      <span className="text-slate-500">MKT</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{o.tif}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">
                    {active ? usd(o.riskUsd) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">
                    {fmtAge(o.ageSec)}
                  </td>
                  <td className="px-3 py-2">
                    <OrderBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">
                    {active ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onAct(o.id, "execute")}
                          title="Fill remainder to market"
                          className="rounded-md bg-long/10 px-2 py-1 text-[10.5px] font-semibold text-long ring-1 ring-long/30 transition hover:bg-long/20"
                        >
                          ⚡ Fill
                        </button>
                        <button
                          onClick={() => onAct(o.id, "reduce")}
                          title="Cut the open quantity in half"
                          className="rounded-md bg-white/5 px-2 py-1 text-[10.5px] font-medium text-slate-300 ring-1 ring-white/15 transition hover:bg-white/10"
                        >
                          ½ Cut
                        </button>
                        <button
                          onClick={() => onAct(o.id, "cancel")}
                          title="Cancel order"
                          className="rounded-md bg-short/10 px-2 py-1 text-[10.5px] font-semibold text-short ring-1 ring-short/30 transition hover:bg-short/20"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-600">settled</span>
                    )}
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

// ---------- execution ladder ----------

export function FillLadder({ fills }: { fills: Fill[] }) {
  return (
    <Panel
      title="Execution ladder"
      right={
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <LiveDot color="var(--long)" />
          {fills.length} prints
        </div>
      }
    >
      <div className="scroll-thin max-h-[420px] divide-y divide-edge/60 overflow-y-auto pr-1">
        {fills.length === 0 && (
          <div className="px-3 py-8 text-center text-[13px] text-slate-500">No prints yet.</div>
        )}
        {fills.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 px-2 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.side === "BUY" ? "bg-long" : "bg-short"}`}
                />
                <span className="font-mono text-[11.5px] font-semibold text-slate-100">{f.symbol}</span>
                <span
                  className={`rounded px-1 text-[9px] font-bold tracking-wider ring-1 ${
                    f.role === "MAKER"
                      ? "text-cyan/90 ring-cyan/30"
                      : "text-amber/90 ring-amber/30"
                  }`}
                >
                  {f.role}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[10px] text-slate-500">
                {f.time} · {f.ref} · {f.venue}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-[12px] font-semibold tabular-nums text-slate-100">
                {fmtPx(f.px)} <span className="text-[10px] font-normal text-slate-500">×</span>{" "}
                {fmtQty(isCrypto(f.symbol), f.qty)}
              </div>
              <div className="mt-0.5 flex items-center justify-end gap-2 text-[10px]">
                <span className={`font-mono tabular-nums ${f.slippageBps <= 2 ? "text-long/80" : "text-amber/90"}`}>
                  {f.slippageBps} bps
                </span>
                <span className="font-mono tabular-nums text-slate-500">fee {usd(f.fee)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- venue quality ----------

export function VenueQuality({ rows }: { rows: VenueRow[] }) {
  return (
    <Panel title="Venue quality" right={<LiveDot color="var(--long)" />}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2 font-medium">Venue</th>
            <th className="px-3 py-2 text-right font-medium">Orders</th>
            <th className="px-3 py-2 font-medium">Fill ratio</th>
            <th className="px-3 py-2 text-right font-medium">Slip</th>
            <th className="px-3 py-2 text-right font-medium">Fees</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.venue} className="border-b border-edge/60 text-[12px] last:border-0">
              <td className="px-3 py-2 font-mono text-slate-200">{r.venue}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">{r.orders}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800/80">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.fillRatio}%` }} />
                  </div>
                  <span className="font-mono text-[10.5px] tabular-nums text-slate-400">{r.fillRatio}%</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <span
                  className={`font-mono tabular-nums ${r.slippageBps <= 2.5 ? "text-long/90" : r.slippageBps <= 5 ? "text-amber/90" : "text-short/90"}`}
                >
                  {r.slippageBps} b
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">{usd(r.fees)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------- risk by symbol ----------

export function RiskBySymbol({ rows }: { rows: { symbol: string; risk: number; notional: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.risk));
  return (
    <Panel title="Stop risk by symbol" right={<span className="text-[11px] text-slate-400">open book only</span>}>
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="px-3 py-8 text-center text-[13px] text-slate-500">No open risk.</div>
        )}
        {rows.map((r) => (
          <div key={r.symbol}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11.5px] font-semibold text-slate-200">{r.symbol}</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {usd(r.risk)} <span className="text-slate-600">/ {usd(r.notional)}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber/50 to-short"
                style={{ width: `${Math.round((r.risk / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
