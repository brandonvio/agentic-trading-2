"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers, tickPrices } from "../../lib/market";
import { IntlPage } from "../../components/fx-intl";

const T0 = seedTickers();

export default function IntlRoute() {
  const mounted = useMounted();
  const [tickers, setTickers] = useState(T0);

  useEffect(() => {
    const id = window.setInterval(() => setTickers((t) => tickPrices(t, { shock: 0.002, riskOff: false })), 2500);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tickers}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">International</h1>
            <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-accent-2 ring-1 ring-accent/35">
              ADR · EM
            </span>
          </div>
          <p className="text-[13px] text-slate-400">
            ADR/local splits, FX-hedge costs, and the EM book&rsquo;s dollar drag
          </p>
        </div>
        <IntlPage />
        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Simulated splits &amp; hedge costs · NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
