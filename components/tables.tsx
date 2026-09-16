import type { Position, Signal, Ticker } from "../lib/market";
import { positionPnl } from "../lib/market";
import { Badge, Delta, LiveDot, Panel } from "./ui";

const usd = (n: number) =>
  (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

export function Positions({ positions, tickers }: { positions: Position[]; tickers: Ticker[] }) {
  const px = (s: string) => tickers.find((t) => t.symbol === s)?.price ?? 0;
  return (
    <Panel
      title="Open Positions"
      icon="▤"
      right={
        <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
          {positions.length} open
        </div>
      }
      className="min-h-0"
    >
      <div className="overflow-x-auto scroll-thin -mx-1 px-1">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 text-left font-medium">Symbol</th>
              <th className="pb-2 text-left font-medium">Strategy</th>
              <th className="pb-2 text-right font-medium">Side</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Avg</th>
              <th className="pb-2 text-right font-medium">Mark</th>
              <th className="pb-2 text-right font-medium">uP&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {positions.map((p) => {
              const mark = px(p.symbol);
              const { pnl, pnlPct } = positionPnl(p, mark);
              return (
                <tr key={p.symbol} className="group hover:bg-white/[0.03]">
                  <td className="py-2.5">
                    <div className="font-semibold text-slate-100">{p.symbol}</div>
                  </td>
                  <td className="py-2.5">
                    <span className="rounded bg-slate-800/70 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-300">
                      {p.strategy}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <Badge tone={p.side === "long" ? "long" : "short"}>
                      {p.side}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-300">{p.qty}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-400">
                    {p.avg.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-200">
                    {mark.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className={pnl >= 0 ? "text-long" : "text-short"}>
                      <span className="font-mono tabular-nums">{usd(pnl)}</span>
                    </div>
                    <div className="font-mono text-[10.5px]">
                      <Delta value={pnlPct} />
                    </div>
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

const statusTone: Record<Signal["status"], "long" | "short" | "warn" | "muted"> = {
  executed: "long",
  pending: "warn",
  rejected: "short",
  skipped: "muted",
};

export function Signals({ signals }: { signals: Signal[] }) {
  return (
    <Panel
      title="AI Signal Feed"
      icon="⬢"
      accent
      right={
        <span className="flex items-center gap-1.5 text-[10.5px] text-accent-2">
          <LiveDot color="var(--color-accent)" /> streaming
        </span>
      }
      className="min-h-0"
    >
      <div className="flex max-h-full flex-col gap-2 overflow-y-auto scroll-thin pr-1">
        {signals.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-edge bg-surface-2/40 px-2.5 py-2 transition-colors hover:border-edge-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={s.side === "long" ? "long" : "short"}>
                  {s.side === "long" ? "▲ BUY" : "▼ SELL"}
                </Badge>
                <span className="font-semibold text-slate-100">{s.symbol}</span>
                <span className="hidden sm:inline rounded bg-slate-800/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {s.strategy}
                </span>
              </div>
              <Badge tone={statusTone[s.status]}>{s.status}</Badge>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-400">{s.reason}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-cyan"
                    style={{ width: `${s.confidence}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-slate-400">{s.confidence}%</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">{s.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
