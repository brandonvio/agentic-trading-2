"use client";

import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import { BrokerCard, CapabilityMatrix, MoneyModel } from "../../components/brokers";
import { BROKERS } from "../../lib/brokers";

const T0 = seedTickers();

export default function BrokersPage() {
  const mounted = useMounted();
  if (!mounted) return <Splash />;
  return (
    <ConsoleShell tickers={T0} mobileStrip>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Brokers · Venues &amp; Money Model</h1>
            </div>
            <p className="text-[13px] text-slate-400">
              Interactive Brokers unifies equities, futures, rates, FX &amp; intl · crypto venues route their asset class · margin, interest &amp; fees are computed, not assumed.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BROKERS.map((b) => (
            <BrokerCard key={b.id} broker={b} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CapabilityMatrix />
          <MoneyModel />
        </div>
      </div>
    </ConsoleShell>
  );
}
