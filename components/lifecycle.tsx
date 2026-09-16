"use client";

import { useMemo, useState } from "react";
import { Badge, Panel } from "./ui";
import {
  aiSuggestParams,
  allowedActions,
  applyAction,
  goLive,
  seedStrategiesV2,
  type Strat,
  type StratAction,
} from "../lib/lifecycle";
import { seedTickers } from "../lib/market";

const COLS: { state: Strat["state"]; label: string; hint: string }[] = [
  { state: "template", label: "Template", hint: "idea, unproven" },
  { state: "backtested", label: "Backtested", hint: "metrics in hand" },
  { state: "paper", label: "Paper", hint: "live signals, no risk" },
  { state: "live", label: "Live", hint: "capital at risk" },
  { state: "killed", label: "Killed", hint: "drift / DD stop" },
];

const ACTION_LABEL: Record<StratAction, string> = {
  backtested: "Backtest complete",
  toPaper: "→ Paper",
  goLive: "Go live",
  kill: "Kill",
  reGate: "Re-gate → paper",
};

export function LifecycleBoard({ tickers }: { tickers?: { symbol: string; history: number[] }[] }) {
  const [strats, setStrats] = useState<Strat[]>(() => seedStrategiesV2());
  const [focusId, setFocusId] = useState<string | null>(null);

  const focus = strats.find((s) => s.id === focusId) ?? null;

  function act(id: string, action: StratAction) {
    setStrats((list) => list.map((s) => (s.id === id ? applyAction(s, action, "just now") : s)));
  }

  return (
    <Panel
      title="Lifecycle · template → backtest → paper → live"
      icon={<>⟲</>}
      right={
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          {strats.filter((s) => s.state === "live").length} LIVE · {strats.filter((s) => s.state === "killed").length} KILLED
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          V6 GATES
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        {COLS.map((col) => {
          const inCol = strats.filter((s) => s.state === col.state);
          return (
            <div key={col.state} className="flex flex-col rounded-lg border border-edge bg-surface-2/25 p-2">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">{col.label}</span>
                  <p className="text-[9px] text-slate-600">{col.hint}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{inCol.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {inCol.map((s) => (
                  <Card key={s.id} s={s} onFocus={() => setFocusId(s.id === focusId ? null : s.id)} focused={focusId === s.id} />
                ))}
                {inCol.length === 0 && <div className="rounded border border-dashed border-edge/60 px-2 py-4 text-center text-[10px] text-slate-600">empty</div>}
              </div>
            </div>
          );
        })}
      </div>

      {focus && (
        <FocusStrip s={focus} tickers={tickers} onAct={(a) => act(focus.id, a)} />
      )}

      <p className="mt-2.5 text-[10px] leading-relaxed text-slate-600">
        Click a card for the gate detail. Only <span className="text-slate-400">go live</span> is gated — every other
        move is instant. Killed strategies re-enter at <span className="text-slate-400">paper</span> with fresh drift
        observation, not straight to capital.
      </p>
    </Panel>
  );
}

function Card({ s, onFocus, focused }: { s: Strat; onFocus: () => void; focused: boolean }) {
  const actions = allowedActions(s.state);
  const driftPct = Math.round(s.drift * 100);
  return (
    <button
      onClick={onFocus}
      className={[
        "rounded-lg border px-2.5 py-2 text-left transition",
        focused ? "border-accent/60 bg-accent/[0.08]" : "border-edge bg-surface/70 hover:border-edge-2",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-[11.5px] font-medium leading-tight text-slate-100">{s.name}</span>
        <span className={`shrink-0 font-mono text-[9px] tabular-nums ${s.pnlUsd >= 0 ? "text-long" : "text-short"}`}>
          {s.pnlUsd >= 0 ? "+" : ""}${(s.pnlUsd / 1000).toFixed(1)}k
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Badge tone="ai">{s.modelId}</Badge>
        {s.state === "killed" && <Badge tone="short">{s.killReason ?? "killed"}</Badge>}
        {s.state !== "killed" && s.state !== "template" && (
          <span className={`font-mono text-[9px] tabular-nums ${driftPct >= 80 ? "text-short" : driftPct >= 50 ? "text-amber" : "text-slate-500"}`}>
            drift {driftPct}%
          </span>
        )}
      </div>
      {s.state !== "template" && (
        <div className="mt-1 font-mono text-[9.5px] tabular-nums text-slate-500">
          win {(s.stats.winRate * 100).toFixed(0)}% · sharpe {s.stats.sharpe.toFixed(2)} · DD {s.stats.maxDD.toFixed(1)}%
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {actions.map((a) => (
          <span
            key={a}
            className={[
              "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide",
              a === "kill"
                ? "border-short/40 text-short"
                : a === "goLive"
                  ? "border-long/40 text-long"
                  : "border-edge text-slate-400",
            ].join(" ")}
          >
            {ACTION_LABEL[a]}
          </span>
        ))}
        {actions.length === 0 && <span className="font-mono text-[9px] text-slate-600">no further states</span>}
      </div>
    </button>
  );
}

function FocusStrip({ s, tickers, onAct }: { s: Strat; tickers?: { symbol: string; history: number[] }[]; onAct: (a: StratAction) => void }) {
  const hist = (tickers ?? seedTickers()).find((t) => t.symbol === s.symbol)?.history ?? seedTickers().find((t) => t.symbol === "NVDA")!.history;
  const gate = useMemo(() => goLive(s, { symbol: s.symbol, history: hist, riskOff: false }), [s, hist]);
  const suggest = useMemo(() => (s.state === "template" || s.state === "killed" ? aiSuggestParams(s.symbol, hist, false) : null), [s, hist]);

  return (
    <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg border border-accent/30 bg-surface/60 p-3 lg:grid-cols-3">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{s.name}</span>
          {gate.ok ? <Badge tone="ok">GATES PASS</Badge> : <Badge tone="warn">GATES FAIL</Badge>}
        </div>
        <div className="space-y-1.5">
          {gate.gates.map((g) => (
            <div key={g.id} className={`flex items-start gap-2 rounded border px-2 py-1.5 ${g.pass ? "border-edge bg-surface-2/30" : "border-amber/45 bg-amber/[0.06]"}`}>
              <span className={`text-[11px] ${g.pass ? "text-long" : "text-amber"}`}>{g.pass ? "✓" : "✕"}</span>
              <div>
                <span className="text-[11px] text-slate-200">{g.label}</span>
                <span className="ml-1.5 font-mono text-[9.5px] text-slate-500">{g.detail}</span>
              </div>
            </div>
          ))}
          <div className="rounded border border-cyan/30 bg-cyan/[0.05] px-2 py-1.5">
            <span className={`font-mono text-[9.5px] uppercase ${gate.aiSignoff ? "text-cyan" : "text-slate-500"}`}>
              V6 {gate.aiSignoff ? "SIGNOFF GRANTED — " : "NO SIGNOFF — "}
            </span>
            <span className="text-[10.5px] text-slate-400">{gate.line}</span>
          </div>
        </div>
      </div>
      <div className="text-[11px] leading-relaxed text-slate-400">
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-400">Params · {s.symbol}</div>
        <div className="grid grid-cols-2 gap-1 font-mono text-[10.5px] tabular-nums">
          {Object.entries(s.params).map(([k, v]) => (
            <span key={k} className="rounded border border-edge bg-surface-2/30 px-1.5 py-1">
              {k} <span className="text-slate-100">{v}</span>
            </span>
          ))}
        </div>
        {s.risk ? (
          <p className="mt-1.5 font-mono text-[10px] text-slate-500">
            stop {s.risk.stopPct}% · ${ (s.risk.sizeUsd / 1000).toFixed(0)}k/trade · cap ${(s.risk.dailyLossCap / 1000).toFixed(0)}k/day · corr ≤ {s.risk.maxCorr}
          </p>
        ) : (
          <p className="mt-1.5 text-amber">no risk envelope — required before capital</p>
        )}
        {s.signoff && <p className="mt-1.5 text-[10px] text-cyan">{s.signoff}</p>}
      </div>
      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {suggest ? "AI param candidate (V6)" : "State machine"}
        </div>
        {suggest ? (
          <div className="rounded border border-edge bg-surface-2/30 p-2">
            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
              {Object.entries(suggest.params).map(([k, v]) => (
                <span key={k} className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-accent-2">
                  {k}={v}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{suggest.rationale}</p>
          </div>
        ) : (
          <div className="rounded border border-edge bg-surface-2/30 p-2 text-[10px] leading-relaxed text-slate-500">
            {s.state} since {s.stateSince}. {s.drift >= 0.8 ? "Drift ≥ 0.8 → auto-paused by V6 registry." : `Drift ${(s.drift * 100).toFixed(0)}%.`}
            <br />Available: {allowedActions(s.state).map((a) => ACTION_LABEL[a]).join(" · ") || "terminal state"}.
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allowedActions(s.state).map((a) => (
            <button
              key={a}
              disabled={a === "goLive" && !gate.ok}
              onClick={() => onAct(a)}
              className={[
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
                a === "kill"
                  ? "border-short/50 bg-short/10 text-short hover:bg-short/20"
                  : a === "goLive" && !gate.ok
                    ? "cursor-not-allowed border-edge text-slate-600"
                    : a === "goLive"
                      ? "border-long/50 bg-long/10 text-long hover:bg-long/20"
                      : "border-edge text-slate-300 hover:bg-white/5",
              ].join(" ")}
            >
              {ACTION_LABEL[a]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
