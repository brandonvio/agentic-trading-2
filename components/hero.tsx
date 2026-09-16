import { useEffect, useState, type ReactNode } from "react";
import { Delta, LiveDot, Panel, Ring, Sparkline } from "./ui";

export interface KpiData {
  portfolio: number;
  dailyPnl: number;
  openPnl: number;
  winRate: number;
  sharpe: number;
  active: number;
  total: number;
  equity: number[];
}

function KpiCard({
  label,
  children,
  footnote,
}: {
  label: string;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-edge bg-surface/80 px-3.5 py-3 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">{children}</div>
      {footnote && <div className="mt-1.5 text-[10.5px] text-slate-500">{footnote}</div>}
    </div>
  );
}

const usd = (n: number) =>
  "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const signed = (n: number) => (n >= 0 ? "+" : "−") + usd(Math.abs(n));

export function KpiStrip({ k }: { k: KpiData }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Portfolio Value" footnote={`${k.active}/${k.total} strategies live`}>
        <div className="text-[19px] font-semibold tracking-tight tabular-nums">
          {usd(k.portfolio)}
        </div>
        <Sparkline data={k.equity} w={70} h={30} tone="var(--color-long)" className="h-8 w-[70px]" />
      </KpiCard>

      <KpiCard label="Daily P&L" footnote="Realized + unrealized">
        <div className={`text-[19px] font-semibold tabular-nums ${k.dailyPnl >= 0 ? "text-long" : "text-short"}`}>
          {signed(k.dailyPnl)}
        </div>
        <Delta value={(k.dailyPnl / k.portfolio) * 100 * 12} className="text-[11px]" />
      </KpiCard>

      <KpiCard label="Open P&L" footnote="6 positions marked">
        <div className={`text-[19px] font-semibold tabular-nums ${k.openPnl >= 0 ? "text-long" : "text-short"}`}>
          {signed(k.openPnl)}
        </div>
      </KpiCard>

      <KpiCard label="Win Rate" footnote="30d rolling">
        <Ring value={k.winRate} size={54} stroke={6} tone="var(--color-cyan)">
          <span className="text-[13px] font-semibold tabular-nums">{k.winRate}%</span>
        </Ring>
      </KpiCard>

      <KpiCard label="Sharpe Ratio" footnote="Annualized · 6m">
        <div className="text-[19px] font-semibold tabular-nums text-accent-2">{k.sharpe.toFixed(2)}</div>
        <div className="text-[11px] text-slate-400">Sortino { (k.sharpe * 1.18).toFixed(2)}</div>
      </KpiCard>

      <KpiCard label="AI Confidence" footnote="Ensemble vote">
        <div className="flex items-center gap-2">
          <div className="text-[19px] font-semibold tabular-nums text-accent-2">
            {(k.winRate * 0.9 + 12).toFixed(0)}
          </div>
          <LiveDot color="var(--color-accent)" />
        </div>
      </KpiCard>
    </div>
  );
}

const REGIMES = [
  "High-vol momentum · trend-following favored",
  "Mean-reversion regime · fade extremes",
  "Cross-exchange arbitrage rich · wide spreads",
  "Low-vol grind · sizing scaled down",
];

const THINKING = [
  "Scanning 8 instruments across 3 venues…",
  "Computing 14 indicators + orderbook depth…",
  "Ensemble of 6 strategies voting…",
  "Calibrating confidence on 5m window…",
  "Estimating slippage @ 2σ…",
  "Sizing to 8% vol-target…",
  "Cross-checking kill-switch limits…",
];

export function AiAgent({ confidence }: { confidence: number }) {
  const [line, setLine] = useState(0);
  const [mode, setMode] = useState<"auto" | "paused">("auto");

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % 24), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel
      title="NX-Alpha · AI Execution Agent"
      icon={<span className="spin-slow inline-block">◈</span>}
      accent
      right={
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-semibold " +
            (mode === "auto"
              ? "bg-long/12 text-long"
              : "bg-amber/12 text-amber")
          }
        >
          <LiveDot color={mode === "auto" ? "var(--color-long)" : "var(--color-amber)"} />
          {mode === "auto" ? "AUTONOMOUS" : "PAUSED"}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-slate-500">Regime model</div>
            <div className="text-[13px] font-medium text-slate-100">{REGIMES[line % REGIMES.length]}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wide text-slate-500">Model</div>
            <div className="font-mono text-[12.5px] text-accent-2">nx-alpha 4.2</div>
          </div>
        </div>

        <div className="rounded-lg border border-edge bg-surface-2/50 p-2.5">
          <div className="flex items-center justify-between text-[10.5px] text-slate-500">
            <span>Live reasoning</span>
            <span className="text-accent-2">streaming</span>
          </div>
          <div className="mt-1 flex items-start gap-2 font-mono text-[12px] text-slate-300">
            <span className="text-accent-2">›</span>
            <span>{THINKING[line % THINKING.length]}</span>
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent-2/70" />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-slate-500">
            <span>Ensemble confidence</span>
            <span className="font-mono text-slate-200">{confidence.toFixed(1)} / 100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-cyan transition-all duration-700"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode((m) => (m === "auto" ? "paused" : "auto"))}
            className={
              "rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors " +
              (mode === "auto"
                ? "bg-amber/15 text-amber ring-1 ring-amber/30 hover:bg-amber/25"
                : "bg-long/15 text-long ring-1 ring-long/30 hover:bg-long/25")
            }
          >
            {mode === "auto" ? "⏸ Pause Agent" : "▶ Resume Agent"}
          </button>
          <button className="rounded-lg bg-short/15 px-3 py-2 text-[12.5px] font-semibold text-short ring-1 ring-short/30 transition-colors hover:bg-short/25">
            ⛔ Kill Switch
          </button>
        </div>
      </div>
    </Panel>
  );
}
