"use client";

import { useEffect, useRef, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import { seedExchanges, suspendVenue, tickExchanges, type ExchangeState } from "../../lib/exchanges";
import { Kpis, VenueCard, VenueEventLog } from "../../components/exchanges";

export default function ExchangesPage() {
  const mounted = useMounted();
  const [state, setState] = useState<ExchangeState>(() => seedExchanges());
  const [paused, setPaused] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  useEffect(() => {
    const t = setInterval(() => {
      if (activeRef.current) setState((s) => tickExchanges(s));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const tape = seedTickers();
  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Exchanges</h1>
              <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-slate-400">
                ALL VENUES
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              Connection health, latency, rate-limit pressure, and the wire event log.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-lg border border-edge px-3 py-1.5 text-[12.5px] font-medium text-slate-300 transition hover:border-accent/50 hover:text-white"
            >
              {paused ? "▶ Resume" : "⏸ Pause feed"}
            </button>
          </div>
        </div>

        <Kpis venues={state.venues} />

        {/* venue grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {state.venues.map((v) => (
            <VenueCard key={v.name} venue={v} onSuspend={(name) => setState((s) => suspendVenue(s, name))} />
          ))}
        </div>

        <VenueEventLog events={state.events} />

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Venue telemetry is simulated — flaps and recoveries happen on their own. NX Trading · demo environment
        </footer>
      </div>
    </ConsoleShell>
  );
}
