"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import {
  isRiskOff,
  regimeLabel,
  seedCore,
  seedTickers,
  tickPrices,
  type MarketCore,
} from "../../lib/market";
import { CarryPanel, DxyPanel, FxBoard } from "../../components/fx-intl";

const T0 = seedTickers();
const START = Date.now();
const C0 = seedCore(START);

export default function FxPage() {
  const mounted = useMounted();
  const [tickers, setTickers] = useState(T0);
  const [core, setCore] = useState<MarketCore>(C0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = seedCore(Date.now());
      setCore(next);
      setTickers((t) => tickPrices(t, { shock: 0.002, riskOff: isRiskOff(next.regime) }));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tickers} mobileStrip>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">FX · Global Currencies</h1>
              <span className="rounded-md bg-cyan/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-cyan ring-1 ring-cyan/35">
                24/5
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              majors, DXY, carry ladder <span className="font-mono text-[11px] text-slate-500">· regime: {regimeLabel(core.regime)}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <FxBoard tickers={tickers} riskOff={isRiskOff(core.regime)} />
            <CarryPanel />
          </div>
          <div className="space-y-4">
            <DxyPanel tickers={tickers} />
          </div>
        </div>
        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Simulated FX quotes · swap &amp; carry are venue-model figures · NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
