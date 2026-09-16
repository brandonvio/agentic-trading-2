"use client";

import { useEffect, useRef, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import { burstAgent, fmtAgentAge, resetAgent, seedAgent, tickAgent, type AgentState } from "../../lib/agent";
import { ConfidenceRing, GuardrailsPanel, StepRow, Telemetry } from "../../components/agent";
import { Panel, LiveDot } from "../../components/ui";

export default function AiAgentPage() {
  const mounted = useMounted();
  const [state, setState] = useState<AgentState>(() => seedAgent());
  const [paused, setPaused] = useState(false);
  const [uptime, setUptime] = useState(0);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  useEffect(() => {
    const t = setInterval(() => {
      if (activeRef.current) {
        setState((s) => tickAgent(s));
        setUptime((u) => u + 2);
      }
    }, 1900);
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
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">AI Agent</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] tracking-wider ring-1 ${
                  paused ? "bg-amber/12 text-amber ring-amber/35" : "bg-long/12 text-long ring-long/35"
                }`}
              >
                <LiveDot color={paused ? "var(--color-amber)" : "var(--color-long)"} />
                {paused ? "PAUSED" : "OBSERVING"}
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              Observational autopilot — thinks, calls tools, watches the tape, and sizes actions against guardrails.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[11px] text-slate-500">
              conf {state.confidence}% · {state.steps.length} steps
            </span>
            <button
              onClick={() => setState((s) => burstAgent(s))}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent/90"
            >
              ✦ Run once
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-lg border border-edge px-3 py-1.5 text-[12.5px] font-medium text-slate-300 transition hover:border-accent/50 hover:text-white"
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              onClick={() => setState(resetAgent())}
              className="rounded-lg border border-edge px-3 py-1.5 text-[12.5px] font-medium text-slate-400 transition hover:border-short/50 hover:text-short"
            >
              ⟲ Reset stream
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* reasoning stream */}
          <div className="xl:col-span-8">
            <Panel
              title="Reasoning stream"
              icon={<>≋</>}
              right={
                <span className="font-mono text-[11px] text-slate-500">
                  newest first · cap 40 · {fmtAgentAge(0)}
                </span>
              }
              className="h-full"
            >
              <ul className="scroll-thin max-h-[calc(100vh-260px)] divide-y divide-edge/40 overflow-y-auto">
                {state.steps.map((s) => (
                  <StepRow key={s.id} s={s} />
                ))}
                {state.steps.length === 0 && (
                  <li className="px-4 py-10 text-center text-slate-500">Stream reset — waiting for next thought…</li>
                )}
              </ul>
            </Panel>
          </div>

          {/* rail */}
          <div className="space-y-4 xl:col-span-4">
            <ConfidenceRing value={state.confidence} prev={state.prevConfidence} />
            <Telemetry tokensTotal={state.tokensTotal} lastMs={state.lastMs} uptimeSec={uptime} />
            <GuardrailsPanel />
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          The agent is observational in this build — decisions are simulated narration, no orders are placed. NX Trading
        </footer>
      </div>
    </ConsoleShell>
  );
}
