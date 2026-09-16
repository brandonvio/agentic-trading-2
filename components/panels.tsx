import { useMemo } from "react";
import type { LogLine, Ticker } from "../lib/market";
import { Badge, Panel, Ring } from "./ui";

const usd = (n: number) =>
  (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ---------------- Risk ----------------
export interface RiskData {
  score: number;
  exposure: number;
  var95: number;
  maxDD: number;
  leverage: number;
  maxPos: number;
}

function Bar({ label, value, tone, max = 100, suffix = "%" }: { label: string; value: number; tone: string; max?: number; suffix?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono tabular-nums text-slate-200">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

export function RiskPanel({ r }: { r: RiskData }) {
  const tone = "var(--color-amber)";
  return (
    <Panel title="Risk Monitor" icon="◉" className="min-h-0">
      <div className="flex items-center gap-4">
        <Ring value={r.score} size={82} stroke={8} tone={r.score > 70 ? "var(--color-long)" : r.score > 40 ? "var(--color-amber)" : "var(--color-short)"}>
          <span className="text-lg font-bold tabular-nums">{r.score}</span>
          <span className="text-[9px] uppercase tracking-wide text-slate-500">risk idx</span>
        </Ring>
        <div className="flex-1 space-y-2.5">
          <Bar label="Exposure" value={r.exposure} tone="var(--color-accent)" />
          <Bar label="VaR 95% d" value={r.var95} tone={tone} max={100} />
          <Bar label="Max DD" value={r.maxDD} tone="var(--color-short)" max={20} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Leverage" value={`${r.leverage}x`} tone={r.leverage >= 3 ? "text-short" : "text-slate-100"} />
        <Stat label="Top pos" value={`${r.maxPos}%`} />
        <Stat label="Kill sw" value="ARMED" tone="text-long" />
      </div>
    </Panel>
  );
}

function Stat({ label, value, tone = "text-slate-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2/50 px-2.5 py-2">
      <div className="text-[9.5px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-[13px] font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

// ---------------- Movers ----------------
export function Movers({ tickers }: { tickers: Ticker[] }) {
  const sorted = useMemo(
    () => [...tickers].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6),
    [tickers]
  );
  return (
    <Panel title="Market Movers" icon="◮" className="min-h-0">
      <div className="flex flex-col gap-1">
        {sorted.map((t) => {
          const w = Math.min(100, (Math.abs(t.change) / 5) * 100);
          const up = t.change >= 0;
          return (
            <div key={t.symbol} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <span className="w-14 font-semibold text-slate-200">{t.symbol}</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/60">
                {up && <div className="absolute right-1/2 h-full rounded-full bg-long/70" style={{ width: `${w / 2}%` }} />}
                {!up && <div className="absolute left-1/2 h-full rounded-full bg-short/70" style={{ width: `${w / 2}%` }} />}
              </div>
              <span className={`w-12 text-right font-mono text-[11px] tabular-nums ${up ? "text-long" : "text-short"}`}>
                {up ? "+" : ""}
                {t.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------------- Order Book ----------------
export function OrderBook({ ticker }: { ticker: Ticker }) {
  const levels = 6;
  const asks = Array.from({ length: levels }, (_, i) => ({
    px: ticker.price * (1 + (i + 1) * 0.0004),
    qty: Math.round((i + 1) * 180 + ((i * 97) % 600)),
  })).reverse();
  const bids = Array.from({ length: levels }, (_, i) => ({
    px: ticker.price * (1 - (i + 1) * 0.0004),
    qty: Math.round((i + 1) * 160 + ((i * 53) % 500)),
  }));
  const maxQty = Math.max(...asks.map((a) => a.qty), ...bids.map((b) => b.qty));
  return (
    <Panel title={`Order Book · ${ticker.symbol}`} icon="▥" className="min-h-0">
      <div className="flex flex-col text-[11.5px] font-mono tabular-nums">
        <div className="mb-1 flex justify-between px-1 text-[9.5px] uppercase tracking-wide text-slate-500">
          <span>Size</span>
          <span>Price</span>
        </div>
        {asks.map((a, i) => (
          <div key={"a" + i} className="relative flex justify-between px-1 py-0.5 text-slate-300">
            <div className="absolute inset-y-0 right-0 bg-short/10" style={{ width: `${(a.qty / maxQty) * 100}%` }} />
            <span className="relative w-14 text-right text-slate-400">{a.qty}</span>
            <span className="relative text-short">{a.px.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        ))}
        <div className="my-1 flex items-center justify-center gap-2 border-y border-edge py-1.5">
          <span className="text-[10px] text-slate-500">MID</span>
          <span className="font-semibold text-slate-100">
            {ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        {bids.map((b, i) => (
          <div key={"b" + i} className="relative flex justify-between px-1 py-0.5 text-slate-300">
            <div className="absolute inset-y-0 right-0 bg-long/10" style={{ width: `${(b.qty / maxQty) * 100}%` }} />
            <span className="relative w-14 text-right text-slate-400">{b.qty}</span>
            <span className="relative text-long">{b.px.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------- Terminal ----------------
const levelStyle: Record<LogLine["level"], string> = {
  info: "text-slate-400",
  ok: "text-long",
  warn: "text-amber",
  err: "text-short",
  ai: "text-accent-2",
};
const levelTag: Record<LogLine["level"], string> = {
  info: "INF",
  ok: " OK ",
  warn: "WRN",
  err: "ERR",
  ai: " AI ",
};

export function Terminal({ log }: { log: LogLine[] }) {
  return (
    <Panel
      title="Execution Log"
      icon="▸"
      right={
        <span className="flex items-center gap-1.5">
          <Badge tone="ok">LIVE</Badge>
          <Badge>tail -f</Badge>
        </span>
      }
      className="min-h-0"
    >
      <div className="flex max-h-full flex-col-reverse gap-1 overflow-y-auto scroll-thin rounded-lg bg-[#04060c] p-2.5 font-mono text-[11.5px] leading-relaxed">
        {[...log].reverse().map((l) => (
          <div key={l.id} className="flex gap-2 whitespace-pre-wrap">
            <span className="shrink-0 text-slate-600">{l.ts}</span>
            <span className={`shrink-0 font-semibold ${levelStyle[l.level]}`}>[{levelTag[l.level]}]</span>
            <span className="text-slate-300">{l.text}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Strategies({ pnlOf }: { pnlOf: (s: string) => number }) {
  const rows = [
    { name: "momentum-v4", side: "long", wins: 62, trades: 148, sharpe: 2.31 },
    { name: "funding-capture", side: "long", wins: 71, trades: 96, sharpe: 1.87 },
    { name: "orderflow-imb", side: "short", wins: 58, trades: 74, sharpe: 1.64 },
    { name: "vol-breakout", side: "long", wins: 49, trades: 121, sharpe: 1.42 },
    { name: "mean-revert-ml", side: "short", wins: 55, trades: 63, sharpe: 1.28 },
  ];
  return (
    <Panel title="Strategy Performance" icon="◈" className="min-h-0">
      <div className="flex flex-col gap-1">
        {rows.map((s) => {
          const pnl = pnlOf(s.name);
          const up = pnl >= 0;
          const bar = Math.min(100, Math.abs(pnl) / 4000);
          return (
            <div key={s.name} className="group rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={"h-1.5 w-1.5 rounded-full " + (up ? "bg-long" : "bg-short")} />
                  <span className="font-mono text-[11.5px] text-slate-200">{s.name}</span>
                </div>
                <span className={`font-mono text-[11px] tabular-nums ${up ? "text-long" : "text-short"}`}>
                  {usd(pnl)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9.5px] text-slate-500">
                  <span className="rounded bg-slate-800/70 px-1 py-px font-mono">{s.side}</span>
                  <span>{s.wins}% WR</span>
                  <span>{s.trades} trades</span>
                  <span>SR {s.sharpe.toFixed(2)}</span>
                </div>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                  <div className={"h-full rounded-full " + (up ? "bg-long" : "bg-short")} style={{ width: `${bar}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export { usd };
