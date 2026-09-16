"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import {
  isRiskOff,
  seedCore,
  seedTickers,
  shockOf,
  tickCore,
  tickPrices,
  type MarketCore,
  type Ticker,
} from "../../lib/market";
import { marketClock } from "../../lib/sessions";
import { eventState, volMultFor } from "../../lib/macro";
import type { MacroEvent } from "../../lib/macro";
import { seedEvents } from "../../lib/macro";
import {
  CrossAssetBoard,
  CorrelationHeat,
  MacroPanel,
  RegimePanel,
  SessionPanel,
} from "../../components/market-panels";

// module-level seed: evaluated once per client load, never during render
const START = Date.now();
const EVENTS: MacroEvent[] = seedEvents(START);

interface MarketState {
  core: MarketCore;
  tickers: Ticker[];
}

const initialState = (): MarketState => ({ core: seedCore(START), tickers: seedTickers() });

export default function MarketPage() {
  const mounted = useMounted();
  const [now, setNow] = useState(START);
  const [st, setSt] = useState<MarketState>(initialState);

  useEffect(() => {
    const tick = () => {
      const ts = Date.now();
      setNow(ts);
      setSt((prev) => {
        const ev = eventState(ts, EVENTS);
        const core = tickCore(prev.core, ts, ev);
        const shock = shockOf(core.regime, volMultFor(ev.phase), core.armedGap);
        return {
          core,
          tickers: tickPrices(prev.tickers, { shock, riskOff: isRiskOff(core.regime) }),
        };
      });
    };
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Splash />;

  const { core, tickers } = st;
  const clock = marketClock(new Date(now));
  const ev = eventState(now, EVENTS);

  return (
    <ConsoleShell tickers={tickers}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Market Core</h1>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-cyan ring-1 ring-cyan/35">
                ∿ cross-asset
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              one regime, one shock per tick — every class moves coherently with real session clocks
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {ev.phase !== "none" && ev.event
              ? `${ev.event.kind} · ${ev.phase.toUpperCase()} · ${ev.countdown}`
              : "calendar quiet · vol ×1.0"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <RegimePanel core={core} now={now} />
            <SessionPanel clock={clock} />
          </div>
          <div className="space-y-4 lg:col-span-6">
            <CorrelationHeat />
            <MacroPanel state={ev} events={EVENTS} now={now} />
          </div>
        </div>

        <CrossAssetBoard tickers={tickers} />

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Simulated cross-asset core. NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
