"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  bestSharpe,
  genRuns,
  rerun,
  sortRuns,
  type BacktestRun,
  type SortKey,
} from "../../lib/backtests";
import { RunsTable, RunDetail, RobustnessPanel, GoLivePanel } from "../../components/backtests";

export default function BacktestsPage() {
  const mounted = useMounted();
  const [runs, setRuns] = useState<BacktestRun[]>(() => genRuns());
  const [selectedId, setSelectedId] = useState<string>(() => runs[0]?.id ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("sharpe");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const symbols = useMemo(() => {
    const s = new Set(runs.map((r) => r.symbol));
    return ["all", ...Array.from(s).sort()];
  }, [runs]);

  const visible = useMemo(() => {
    const filtered = symbolFilter === "all" ? runs : runs.filter((r) => r.symbol === symbolFilter);
    return sortRuns(filtered, sortKey);
  }, [runs, symbolFilter, sortKey]);

  const selected = runs.find((r) => r.id === selectedId) ?? visible[0] ?? runs[0];

  function handleRerun(id: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRerunningId(id);
    timerRef.current = setTimeout(() => {
      setRuns((rs) => rs.map((r) => (r.id === id ? rerun(r) : r)));
      setSelectedId(id);
      setRerunningId(null);
    }, 700);
  }

  const tape = seedTickers();
  if (!mounted) return <Splash />;

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "sharpe", label: "Sharpe" },
    { key: "netPnl", label: "Net PnL" },
    { key: "trades", label: "Trades" },
  ];

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Backtests</h1>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-cyan ring-1 ring-cyan/35">
                ▦ {runs.length} RUNS
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              best sharpe <span className="font-mono text-cyan">{bestSharpe(runs).toFixed(2)}</span> · reruns jitter execution to bound overfit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* sort tabs */}
            <div className="flex overflow-hidden rounded-lg border border-edge">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortKey(s.key)}
                  className={`px-3 py-1.5 text-[11.5px] transition ${
                    sortKey === s.key ? "bg-accent/20 font-semibold text-accent-2" : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {/* symbol chips */}
            <div className="flex flex-wrap gap-1">
              {symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbolFilter(s)}
                  className={`rounded-md border px-2 py-1 font-mono text-[10.5px] tracking-wide transition ${
                    symbolFilter === s
                      ? "border-cyan/50 bg-cyan/12 text-cyan"
                      : "border-edge text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s === "all" ? "ALL" : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <RunsTable
              runs={visible}
              selectedId={selected?.id ?? ""}
              onSelect={setSelectedId}
              onRerun={handleRerun}
              rerunningId={rerunningId}
            />
          </div>
            {promoted && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-long/40 bg-long/[0.08] px-3 py-2">
                <span className="text-[12px] text-long">✓ {promoted} promoted — drift monitoring + P&L attribution active (demo)</span>
                <button onClick={() => setPromoted(null)} className="font-mono text-[10px] text-slate-400 hover:text-slate-200">DISMISS</button>
              </div>
            )}
          <div className="space-y-4 xl:col-span-5">
            {selected && (
              <>
                <RunDetail
                  run={selected}
                  onRerun={() => handleRerun(selected.id)}
                  rerunning={rerunningId === selected.id}
                />
                <RobustnessPanel run={selected} />
                <GoLivePanel run={selected} onGoLive={(s) => setPromoted(s.name)} />
              </>
            )}
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          {selected ? `${selected.strategy} · ${selected.symbol} · ${selected.timeframe} · ${selected.rangeText}` : ""} —
          walk-forward + Monte-Carlo DD + sensitivity surface · go-live gates from the V6 brain. NX Trading v2
        </footer>
      </div>
    </ConsoleShell>
  );
}
