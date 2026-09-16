"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import { Ladders, RollPanel, SpreadsPanel } from "../../components/rates-futures";

const T0 = seedTickers();
const START = Date.now();

export default function FuturesPage() {
  const mounted = useMounted();
  const [now, setNow] = useState(START);
  const [tickers, setTickers] = useState(T0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      setTickers((t) => tickPrices(t, { shock: 0.003, riskOff: false }));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tickers}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Futures</h1>
            <span className="rounded-md bg-cyan/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-cyan ring-1 ring-cyan/35">
              CME · simulated
            </span>
          </div>
          <p className="text-[13px] text-slate-400">
            contract ladders, carry shape, roll discipline &amp; contract economics
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Ladders now={now} />
          </div>
          <div className="space-y-4">
            <SpreadsPanel now={now} />
            <RollPanel now={now} />
          </div>
        </div>
        <footer className="pt-2 text-center text-[11px] text-slate-600">Simulated futures data · not executable · NX Trading</footer>
      </div>
    </ConsoleShell>
  );
}
