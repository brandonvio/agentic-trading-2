"use client";

import { useMemo, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  applyScenario,
  baseLimits,
  computeVaCvar,
  scenarios,
  seededReturns,
  stressMatrix,
  type StressedLimit,
} from "../../lib/risklab";
import { LimitGauges, ScenarioTable, StressHeatmap, VaCvarPanel } from "../../components/risklab";

export default function RiskLabPage() {
  const mounted = useMounted();
  const [selectedId, setSelectedId] = useState<string>(() => scenarios()[0].id);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scens = useMemo(() => scenarios(), []);
  const limits = useMemo(() => baseLimits(), []);
  const vc = useMemo(() => computeVaCvar(seededReturns()), []);
  const matrix = useMemo(() => stressMatrix(scens), [scens]);

  const activeScen = scens.find((s) => s.id === activeId) ?? null;

  const stressed: StressedLimit[] = useMemo(
    () => (activeScen ? applyScenario(limits, activeScen) : limits.map((l) => ({ ...l, stressedPct: l.pct, breached: l.pct >= 100, delta: 0 }))),
    [activeScen, limits],
  );

  const tape = seedTickers();
  if (!mounted) return <Splash />;

  const breachedCount = stressed.filter((l) => l.delta > 0 && l.stressedPct >= 100).length;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Risk Lab</h1>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-long/12 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-long ring-1 ring-long/35">
                ∿ 512 OBS
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              stress the book, watch the limits — nothing here trades
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {activeScen
              ? `STRESSING · ${activeScen.name} · Δ ${breachedCount} breached`
              : "baseline utilization"}
          </div>
        </div>

        {/* scenario banner */}
        {activeScen && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              breachedCount > 0 ? "border-short/40 bg-short/8" : "border-amber/40 bg-amber/8"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[15px]">⚠</span>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">
                  Applying scenario: {activeScen.name}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  ΔPnL −${Math.abs(Math.round(activeScen.pnlDeltaUsd / 1000))}k · VaR1d +${Math.round(activeScen.varImpact / 1000)}k ·{" "}
                  {breachedCount} limit{breachedCount === 1 ? "" : "s"} breached
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveId(null)}
              className="rounded-lg border border-edge px-3 py-1.5 text-[12px] font-medium text-slate-300 transition hover:border-short/50 hover:text-short"
            >
              ⟲ Reset stress
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <LimitGauges limits={stressed} activeScenario={activeScen} />
          </div>
          <div className="space-y-4 xl:col-span-7">
            <VaCvarPanel vc={vc} varImpact={activeScen ? activeScen.varImpact : null} />
            <ScenarioTable
              scenarios={scens}
              selectedId={selectedId}
              activeId={activeId}
              onSelect={setSelectedId}
              onApply={(id) => setActiveId(id)}
              onReset={() => setActiveId(null)}
            />
          </div>
        </div>

        <StressHeatmap scenarios={scens} matrix={matrix} activeId={activeId} />

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Scenarios are desk-defined narratives, not simulations. NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
