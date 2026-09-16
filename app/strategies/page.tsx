"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import {
  BookKpi,
  AttributionPanel,
  FleetPanel,
  InspectorPanel,
  StrategyCard,
} from "../../components/strategy";
import { LifecycleBoard } from "../../components/lifecycle";
import { bookStats, seedStrategies, tickStrategies, type Strategy } from "../../lib/strategies";
import { seedTickers, tickPrices } from "../../lib/market";
import { usd } from "../../components/panels";

type Filter = "all" | "live" | "paused";
type SortKey = "pnl" | "sharpe" | "win" | "trades";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["live", "Live"],
  ["paused", "Paused"],
];

const SORTS: [SortKey, string][] = [
  ["pnl", "Session P&L"],
  ["sharpe", "Sharpe"],
  ["win", "Win rate"],
  ["trades", "Trade flow"],
];

export default function StrategiesPage() {
  const [strats, setStrats] = useState<Strategy[]>(() => seedStrategies());
  const [tape, setTape] = useState(() => seedTickers());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("pnl");
  const [paused, setPaused] = useState(false);
  const ready = useMounted();

  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  // ticker tape
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeRef.current) return;
      setTape((t) => tickPrices(t));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // strategy engine simulation
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeRef.current) return;
      setStrats((list) => tickStrategies(list));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => bookStats(strats), [strats]);

  const visible = useMemo(() => {
    const f =
      filter === "all"
        ? strats
        : strats.filter((s) => (filter === "live" ? s.status === "live" : s.status !== "live"));
    const key = (s: Strategy) =>
      sort === "pnl" ? s.pnl : sort === "sharpe" ? s.sharpe : sort === "win" ? s.winRate : s.trades;
    return [...f].sort((a, b) => key(b) - key(a));
  }, [strats, filter, sort]);

  const selected = strats.find((s) => s.id === selectedId) ?? null;

  const setParam = (id: string, patch: Partial<Strategy>) =>
    setStrats((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const toggleStatus = (id: string) =>
    setStrats((list) =>
      list.map((s) =>
        s.id === id ? { ...s, status: s.status === "live" ? "paused" : "live" } : s
      )
    );

  if (!ready) return <Splash detail="Loading strategy engine…" />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="space-y-3.5">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Strategy Engine</h1>
            <p className="text-[12px] text-slate-500">
              {stats.live} of {stats.total} engines live · blended Sharpe {stats.blendedSharpe.toFixed(2)} ·{" "}
              <span className="text-slate-400">{usd(stats.exposure * 10)}</span> of book capital deployed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className={[
                "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ring-1 transition-colors ",
                paused
                  ? "bg-amber/15 text-amber ring-amber/40 hover:bg-amber/25"
                  : "bg-long/15 text-long ring-long/40 hover:bg-long/25",
              ].join(" ")}
            >
              {paused ? "▶ Resume Engines" : "⏸ Pause Engines"}
            </button>
            <button className="rounded-lg border border-edge bg-surface-2/60 px-3.5 py-2 text-[12.5px] font-medium text-slate-200 transition-colors hover:border-edge-2">
              Rebalance book
            </button>
            <button className="rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-2">
              + New Strategy
            </button>
          </div>
        </div>

        {paused && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber/35 bg-amber/10 px-3.5 py-2.5 text-[12px] text-amber">
            <span className="h-2 w-2 rounded-full bg-amber" />
            Engines paused — no new signals or fills. Risk controls and inspection remain available.
          </div>
        )}

        {/* v2 lifecycle board (V9) */}
        <LifecycleBoard tickers={tape} />

        {/* book KPIs */}
        <BookKpi
          k={{
            live: stats.live,
            total: stats.total,
            pnl: stats.pnl,
            pnl30d: stats.pnl30d,
            sharpe: stats.blendedSharpe,
            winRate: stats.avgWinRate,
            trades: stats.totalTrades,
            exposure: stats.exposure,
          }}
        />

        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-edge bg-surface/60 px-3 py-2">
          <div className="flex items-center gap-1">
            {FILTERS.map(([k, label]) => {
              const n =
                k === "all" ? strats.length : strats.filter((s) => (k === "live" ? s.status === "live" : s.status !== "live")).length;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={[
                    "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ",
                    filter === k
                      ? "bg-accent/15 text-accent-2 ring-1 ring-accent/40"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                  ].join(" ")}
                >
                  {label} <span className="font-mono text-[10.5px] opacity-70">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[10.5px] uppercase tracking-[0.12em] text-slate-500">Sort</span>
            {SORTS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={[
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ",
                  sort === k
                    ? "bg-slate-700/60 text-slate-100"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* inspector */}
        {selected && (
          <InspectorPanel
            s={selected}
            onClose={() => setSelectedId(null)}
            onToggleStatus={() => toggleStatus(selected.id)}
          />
        )}

        {/* strategy cards */}
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {visible.map((s) => (
            <StrategyCard
              key={s.id}
              s={s}
              selected={selectedId === s.id}
              onSelect={() => setSelectedId((cur) => (cur === s.id ? null : s.id))}
              onToggleStatus={() => toggleStatus(s.id)}
              onParam={(patch) => setParam(s.id, patch)}
            />
          ))}
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-edge bg-surface/40 p-10 text-center text-[13px] text-slate-500">
              No {filter} strategies match.
            </div>
          )}
        </div>

        {/* bottom band */}
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AttributionPanel list={strats} />
          </div>
          <div className="xl:col-span-5">
            <FleetPanel
              list={strats}
              onOpen={(id) => {
                setSelectedId(id);
                document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3 text-[10.5px] text-slate-600">
          <span>NX-TRADING · strategy engine 4.2 · simulated fills · not financial advice</span>
          <span className="font-mono">
            {strats.filter((s) => s.status === "live").length} engines · 3 venues · latency 1.4ms
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>related:</span>
          <Link href="/signals" className="text-accent-2 hover:underline">Signals</Link>
          <span>·</span>
          <Link href="/backtests" className="text-accent-2 hover:underline">Backtests</Link>
          <span>·</span>
          <Link href="/ai-agent" className="text-accent-2 hover:underline">AI Agent</Link>
        </div>
      </div>
    </ConsoleShell>
  );
}
