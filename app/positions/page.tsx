"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import { bestVenue } from "../../lib/brokers";
import { moneyFor } from "../../lib/money";
import {
  actOnPosition,
  bookStats,
  bySymbol,
  closeAll,
  seedPositions,
  tickPositions,
  type Book,
  type PosAction,
} from "../../lib/positions";
import { ExposurePanel, Kpis, PnlBySymbol, PositionsTable, RealizedLog } from "../../components/positions";

const SIDE_FILTERS = [
  { key: "all", label: "All" },
  { key: "LONG", label: "Longs" },
  { key: "SHORT", label: "Shorts" },
] as const;

type FilterKey = (typeof SIDE_FILTERS)[number]["key"];

export default function PositionsPage() {
  const mounted = useMounted();
  const [paused, setPaused] = useState(false);
  const [book, setBook] = useState<Book>(() => seedPositions());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!activeRef.current) return;
      setBook((b) => tickPositions(b));
    }, 2400);
    return () => clearInterval(t);
  }, []);

  const [tape, setTape] = useState(() => seedTickers());
  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setTape((prev) => tickPrices(prev)), 1400);
    return () => clearInterval(t);
  }, [mounted]);

  const shown = useMemo(
    () =>
      book.positions.filter(
        (p) =>
          (filter === "all" || p.side === filter) &&
          (query.trim() === "" || p.symbol.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [book.positions, filter, query]
  );

  const stats = useMemo(() => bookStats(book), [book]);
  const interest = useMemo(() => {
    const ib = bestVenue("equity");
    return ib ? moneyFor(ib, book.positions).interest30d : 0;
  }, [book.positions]);
  const symbols = useMemo(() => bySymbol(book), [book]);
  const realizedPnl = useMemo(() => book.closes.reduce((a, c) => a + c.pnl, 0), [book.closes]);

  const countFor = (k: FilterKey) =>
    k === "all"
      ? book.positions.length
      : book.positions.filter((p) => p.side === k).length;

  const act = (id: string, a: PosAction) => setBook((b) => actOnPosition(b, id, a));
  const sweepFlat = () => setBook((b) => closeAll(b));

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Positions</h1>
            <p className="text-[13px] text-slate-400">
              Every open position, its mark, its extremes — and the trail of what the desk has realized.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-edge bg-surface/80 px-3 py-2 font-mono text-[12px] tabular-nums text-slate-300">
              Realized {realizedPnl >= 0 ? "+" : "−"}
              {Math.abs(realizedPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
            <button
              onClick={sweepFlat}
              disabled={book.positions.length === 0}
              className="rounded-lg border border-edge bg-surface/80 px-3 py-2 text-[12.5px] font-medium text-slate-200 transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sweep book flat
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className={[
                "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ring-1 transition-colors",
                paused
                  ? "bg-amber/10 text-amber ring-amber/40 hover:bg-amber/20"
                  : "bg-long/10 text-long ring-long/40 hover:bg-long/20",
              ].join(" ")}
            >
              {paused ? "▶ Resume" : "❚❚ Pause book"}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <Kpis stats={stats} interestUsd={interest} />

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-surface/60 px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {SIDE_FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-accent/15 text-accent-2 ring-1 ring-accent/40"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  ].join(" ")}
                >
                  {f.label}{" "}
                  <span className="ml-1 font-mono text-[10.5px] opacity-70">{countFor(f.key)}</span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter instrument…"
              className="w-40 rounded-lg border border-edge bg-surface-2/60 px-3 py-1.5 text-[12.5px] text-slate-200 placeholder:text-slate-600 focus:border-accent/60 focus:outline-none sm:w-48"
            />
          </div>
        </div>

        <PositionsTable positions={shown} onAct={act} />

        {/* bottom band */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <RealizedLog closes={book.closes} />
          </div>
          <div className="xl:col-span-4">
            <PnlBySymbol rows={symbols} />
          </div>
          <div className="xl:col-span-4">
            <ExposurePanel stats={stats} />
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Positions are simulated — marks drift on a 2.4s tick, no real fills or broker state. NX Trading · demo environment
        </footer>
      </div>
    </ConsoleShell>
  );
}
