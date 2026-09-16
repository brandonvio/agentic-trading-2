"use client";

import { useEffect, useMemo, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import { chainFor } from "../../lib/options";
import {
  ChainBoard,
  GexPanel,
  IVSurfacePanel,
  MaxPainPanel,
  StrategyLab,
} from "../../components/options";

const SYMBOLS = ["NVDA", "TSLA", "AAPL", "BTC-USD", "ETH-USD", "ES", "NQ", "CL", "GLD", "ZB", "TLT", "EUR/USD"];
const DTE = [7, 15, 30, 60, 90, 180];

const T0 = seedTickers();

export default function OptionsPage() {
  const mounted = useMounted();
  const [symbol, setSymbol] = useState("NVDA");
  const [dte, setDte] = useState(30);
  const [tickers, setTickers] = useState(T0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTickers((t) => tickPrices(t, { shock: 0.004, riskOff: false }));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const spot = useMemo(() => tickers.find((t) => t.symbol === symbol)?.price ?? 100, [tickers, symbol]);
  const rows = useMemo(() => chainFor(symbol, spot, dte), [symbol, spot, dte]);

  if (!mounted) return <Splash />;

  const mBtn = (active: boolean) =>
    `rounded-md px-2 py-1 font-mono text-[10.5px] ring-1 transition-colors ${
      active ? "bg-accent/15 text-accent-2 ring-accent/40" : "text-slate-400 ring-edge hover:text-slate-200"
    }`;

  return (
    <ConsoleShell tickers={tickers}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Options & Volatility</h1>
              <span className="rounded-md bg-accent/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-accent-2 ring-1 ring-accent/35">
                BS · deterministic IV
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              chains, greeks, skew & term structure, max pain, gamma — all computed from the live spot
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SYMBOLS.map((s) => (
              <button key={s} onClick={() => setSymbol(s)} className={mBtn(symbol === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-[10.5px] uppercase tracking-wider text-slate-500">expiry</span>
          {DTE.map((d) => (
            <button key={d} onClick={() => setDte(d)} className={mBtn(dte === d)}>
              {d}d
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-slate-500">spot {spot.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ChainBoard rows={rows} />
          </div>
          <div className="space-y-4 lg:col-span-5">
            <IVSurfacePanel symbol={symbol} dtes={[30, 90, 180]} />
            <MaxPainPanel rows={rows} spot={spot} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <StrategyLab symbol={symbol} spot={spot} dte={dte} />
          </div>
          <div className="lg:col-span-4">
            <GexPanel rows={rows} spot={spot} />
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Simulated options surface · not executable · NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
