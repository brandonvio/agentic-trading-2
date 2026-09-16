"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { AgentSteps, ExplainPanel, RegistryTable } from "../../components/brain";
import { isRiskOff, shockOf, tickCore, tickPrices, type MarketCore, seedCore, seedTickers, type Ticker } from "../../lib/market";
import { Badge } from "../../components/ui";

const PICKS = ["QQQ", "NVDA", "GC-PERP", "TLT", "EUR/USD", "TOYOF", "BTC-PERP"];

interface State {
  core: MarketCore;
  tickers: Ticker[];
}

export default function AiPage() {
  const mounted = useMounted();
  const [state, setState] = useState<State>(() => ({ core: seedCore(1767799200000 + 90_000), tickers: seedTickers() }));
  const [sel, setSel] = useState("QQQ");
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const core = tickCore(s.core, Date.now());
        return { core, tickers: tickPrices(s.tickers, { shock: shockOf(core.regime), riskOff: isRiskOff(core.regime) }) };
      });
    }, 900);
    return () => clearInterval(id);
  }, []);
  if (!mounted) return <Splash />;
  const t = state.tickers.find((x) => x.symbol === sel);
  const riskOff = isRiskOff(state.core.regime);
  const hist = (t?.history ?? [100]) as number[];
  return (
    <ConsoleShell tickers={state.tickers} mobileStrip>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">AI Brain</h1>
              <Badge tone="ai">computation, not copy</Badge>
            </div>
            <p className="text-[13px] text-slate-400">
              Signals are pure functions: features(ticks) → weighted score → attribution that sums exactly. The agent feed narrates computations — never the other way around.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PICKS.map((s) => (
              <button
                key={s}
                onClick={() => setSel(s)}
                className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${sel === s ? "bg-accent text-slate-950" : "bg-surface-2 text-slate-300 ring-1 ring-edge/40 hover:bg-slate-700/50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <ExplainPanel symbol={sel} history={hist} riskOff={riskOff} />
        <RegistryTable />
        <AgentSteps symbol={sel} history={hist} riskOff={riskOff} />
      </div>
    </ConsoleShell>
  );
}
