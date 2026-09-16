"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import { RatesBoard } from "../../components/rates-futures";

const T0 = seedTickers();
const START = Date.now();

export default function RatesPage() {
  const mounted = useMounted();
  const [now, setNow] = useState(START);
  const [tickers, setTickers] = useState(T0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      setTickers((t) => tickPrices(t, { shock: 0.002, riskOff: false }));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tickers}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">US Treasuries</h1>
            <span className="rounded-md bg-amber/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-amber ring-1 ring-amber/35">
              curve · DV01
            </span>
          </div>
          <p className="text-[13px] text-slate-400">
            yield curve, duration, DV01 math, 2s10s signal &amp; scenario-shifted pricing
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RatesBoard now={now} />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <PanelTwoTen />
          </div>
        </div>
        <footer className="pt-2 text-center text-[11px] text-slate-600">Simulated curve · educational math, not market data · NX Trading</footer>
      </div>
    </ConsoleShell>
  );
}

function PanelTwoTen() {
  return (
    <div className="rounded-xl border border-edge-2 bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">why this panel exists</div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
        Rates are the <span className="text-slate-200">denominator</span> of every risk asset. The 2s10s
        read, DV01 sizing and the bear-steepener scenario slider feed the risk lab and the AI brain&apos;s
        rates feature vector — move the knobs and watch the inversion flag flip live.
      </p>
    </div>
  );
}
