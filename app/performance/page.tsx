"use client";

import { useMemo } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  attribution,
  headline,
  history,
  monthsMatrix,
  rolling,
} from "../../lib/performance";
import { AttributionPanel, Heatmap, HistoryChart, RollingStrip } from "../../components/performance";

const K = 1000;

export default function PerformancePage() {
  const mounted = useMounted();
  const months = useMemo(() => monthsMatrix(), []);
  const hist = useMemo(() => history(), []);
  const attr = useMemo(() => attribution(), []);
  const windows = useMemo(() => rolling(), []);
  const head = useMemo(() => headline(months, hist), [months, hist]);

  const tape = seedTickers();
  if (!mounted) return <Splash />;

  const kpis = [
    { label: "Cumulative PnL · 12m", value: `+${(head.cumulative / K).toFixed(0)}k`, sub: `on $1M base · ${head.ytd > 0 ? "+" : ""}${head.ytd.toFixed(1)}% YTD`, tone: "text-long" },
    { label: "Best month", value: `${head.best.month} '${String(head.best.year).slice(2)}`, sub: `+${head.best.total.toFixed(1)}% · ${head.best.days.length} active days`, tone: "text-accent-2" },
    { label: "Alpha vs bench · 90d", value: `+${head.last30Alpha.toFixed(1)}pt`, sub: "self outperformance, equity-normalized", tone: "text-long" },
    { label: "Total attributed", value: `+${(attr.totalPnl / K).toFixed(0)}k`, sub: "strategy · symbol · factor slices sum", tone: "text-slate-100" },
  ];

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Performance</h1>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-long/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-long ring-1 ring-long/35">
                ∿ +60bps/day edge
              </span>
            </div>
            <p className="text-[13px] text-slate-400">the record — every number below is from the book</p>
          </div>
          <div className="font-mono text-[11px] text-slate-500">window: Jul ’25 → Jun ’26 · $1M base equity</div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-edge bg-surface px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{k.label}</div>
              <div className={`mt-1 font-mono text-[20px] font-semibold tabular-nums ${k.tone}`}>{k.value}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Heatmap months={months} />
          </div>
          <div className="xl:col-span-5">
            <AttributionPanel attr={attr} />
          </div>
        </div>

        <HistoryChart hist={hist} />
        <RollingStrip windows={windows} />

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Equity-normalized against a passive BTC/ETH 60/40 basket. NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
