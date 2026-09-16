"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import {
  actOnSignal,
  engineStats,
  feedStats,
  makeSignal,
  seedSignals,
  tickSignals,
  type SignalAction,
  type TradedSignal,
} from "../../lib/signals";
import {
  EngineStats,
  FeedKpis,
  SignalDetail,
  SignalFeed,
} from "../../components/signals";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "filled", label: "Open pos" },
  { key: "closed", label: "Closed" },
  { key: "stopped", label: "Stopped" },
  { key: "rejected", label: "Rejected" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function matches(s: TradedSignal, f: StatusFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "active":
      return s.status === "ACTIVE";
    case "filled":
      return s.status === "FILLED";
    case "closed":
      return s.status === "CLOSED" || s.status === "EXPIRED";
    case "stopped":
      return s.status === "STOPPED";
    case "rejected":
      return s.status === "REJECTED";
  }
}

export default function SignalsPage() {
  const mounted = useMounted();
  const [paused, setPaused] = useState(false);
  const [signals, setSignals] = useState<TradedSignal[]>(() => seedSignals());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!activeRef.current) return;
      setSignals((prev) => tickSignals(prev));
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
      signals.filter(
        (s) =>
          matches(s, filter) &&
          (query.trim() === "" || s.symbol.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [signals, filter, query]
  );

  const stats = useMemo(() => feedStats(signals), [signals]);
  const engRows = useMemo(() => engineStats(signals), [signals]);
  const selected = signals.find((s) => s.id === selectedId) ?? null;

  const countFor = (f: StatusFilter) =>
    f === "all" ? signals.length : signals.filter((s) => matches(s, f)).length;

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Signals</h1>
            <p className="text-[13px] text-slate-400">
              Every order the engines want to place — edge, confidence, and where it ended up.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSignals((prev) => [makeSignal("ACTIVE"), ...prev].slice(0, 34))}
              className="rounded-lg border border-edge bg-surface/80 px-3 py-2 text-[12.5px] font-medium text-slate-200 transition hover:border-accent/50 hover:text-white"
            >
              + Inject signal
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
              {paused ? "▶ Resume feed" : "❚❚ Pause feed"}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <FeedKpis stats={stats} feedSize={signals.length} />

        {/* filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-surface/60 px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => {
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

        {/* detail or feed */}
        {selected ? (
          <SignalDetail
            s={selected}
            onAction={(a: SignalAction) => setSignals((prev) => actOnSignal(prev, selected.id, a))}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <SignalFeed signals={shown} selectedId={selectedId} onSelect={setSelectedId} />
        )}

        {/* engine performance */}
        <EngineStats rows={engRows} />

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Signal desk is simulated — nothing in this feed reached an exchange. NX Trading · demo
          environment
        </footer>
      </div>
    </ConsoleShell>
  );
}
