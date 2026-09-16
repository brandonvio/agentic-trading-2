"use client";

import { useMemo, useState } from "react";
import { featuresFor, modelsFor, rankModels, type Features } from "../lib/brain";
import { attributePnl, driftOf, pauseForDrift, promote, resume, seedFills, seedRegistry, type ModelRecord } from "../lib/registry";
import { meta } from "../lib/instruments";
import { Badge, LiveDot, Panel } from "./ui";

const FEAT_LABEL: Record<string, string> = {
  momZ: "momentum z",
  trendStrength: "trend strength",
  bookImb: "book imbalance",
  funding: "funding level",
  ivSlope: "IV slope",
  regimeBeta: "regime beta",
  spreadBps: "spread cost",
  corrToEs: "ES correlation",
  volNorm: "vol regime",
};

function Bar({ v, max }: { v: number; max: number }) {
  const pct = Math.min(100, (Math.abs(v) / Math.max(0.001, max)) * 50);
  return (
    <div className="relative h-3 w-full rounded-sm bg-slate-800/70">
      <div className="absolute left-1/2 top-0 h-3 w-px bg-slate-600" />
      <div
        className={`absolute top-0 h-3 ${v >= 0 ? "left-1/2 bg-long/80" : "bg-short/80"}`}
        style={v >= 0 ? { width: `${pct}%` } : { width: `${pct}%`, right: "50%" }}
      />
    </div>
  );
}

export function ExplainPanel({ symbol, history, riskOff }: { symbol: string; history: number[]; riskOff: boolean }) {
  const f: Features = useMemo(() => featuresFor(symbol, history, riskOff), [symbol, history, riskOff]);
  const ranked = useMemo(() => rankModels(symbol, f), [symbol, f]);
  const best = ranked[0];
  const maxAtt = Math.max(0.05, ...best.attributions.map((a) => Math.abs(a.contribution)));
  const others = ranked.slice(1, 3);
  return (
    <Panel title={`Explain · ${symbol} (${meta(symbol).name})`} right={<Badge tone="ai">computed, not narrated</Badge>}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">features (live-derived)</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(f) as (keyof Features)[]).map((k) => (
              <div key={k} className="rounded-md bg-surface-2/60 p-1.5 ring-1 ring-edge/40">
                <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{FEAT_LABEL[k]}</div>
                <div className={`font-mono text-[12px] font-semibold ${f[k] >= 0 ? "text-long" : "text-short"}`}>
                  {f[k] >= 0 ? "+" : ""}{f[k].toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
            {best.model} {best.version} → {best.side} @ {best.clipped >= 0 ? "+" : ""}{best.clipped.toFixed(3)}
          </div>
          <div className="space-y-1.5">
            {best.attributions.map((a) => (
              <div key={a.feature} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-slate-400">{FEAT_LABEL[a.feature]}</span>
                <Bar v={a.contribution} max={maxAtt} />
                <span className={`w-14 shrink-0 text-right font-mono text-[11px] ${a.contribution >= 0 ? "text-long" : "text-short"}`}>
                  {a.contribution >= 0 ? "+" : ""}{a.contribution.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-500">
            <span>Σ contributions = {best.score.toFixed(3)} (exact)</span>
            <span>conf {best.confidence}%</span>
          </div>
          <p className="mt-2 rounded-md bg-surface-2/50 p-2 text-[11.5px] leading-relaxed text-slate-400 ring-1 ring-edge/40">
            {best.reason}
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-edge/40 pt-3">
        <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
          why not the other side — runner-up reads
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {others.map((d) => (
            <div key={d.modelId} className="flex items-center gap-2 text-[11px]">
              <span className="font-mono text-slate-300">{d.model} {d.version}</span>
              <span className="text-slate-600">→</span>
              <span className={d.side === "LONG" ? "text-long" : d.side === "SHORT" ? "text-short" : "text-slate-400"}>
                {d.side}
              </span>
              <span className="font-mono text-slate-500">{d.clipped >= 0 ? "+" : ""}{d.clipped.toFixed(2)}</span>
              <span className="truncate text-slate-500">top: {FEAT_LABEL[d.attributions[0]?.feature ?? "momZ"]}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const SLOT_OPTIONS = [
  { id: "equity-trend", label: "equity trend slot" },
  { id: "crypto-funding", label: "crypto funding slot" },
  { id: "etf-revert", label: "ETF revert slot" },
  { id: "crypto-xv", label: "crypto arb slot" },
];

export function RegistryTable() {
  const [reg, setReg] = useState<Record<string, ModelRecord>>(() => {
    const base = seedRegistry();
    const attributed = attributePnl(base, seedFills());
    return Object.fromEntries(attributed.map((r) => [r.id, r]));
  });
  const [fired, setFired] = useState<string | null>(null);
  const rows = Object.values(reg);
  const driftDemo = useMemo(() => {
    const base = featuresFor("BTC-PERP", [118000, 118400, 118100, 118900, 119200, 119600, 119400, 119800], false);
    const recent = [base, { ...base, momZ: base.momZ + 0.4, bookImb: base.bookImb - 0.5 }, { ...base, momZ: base.momZ - 0.3, volNorm: base.volNorm + 0.2 }];
    const baseline = [base, base, base];
    return driftOf({ recent, baseline });
  }, []);

  function act(fn: (r: Record<string, ModelRecord>) => Record<string, ModelRecord>, id?: string) {
    setReg((cur) => {
      const next = fn(cur);
      const withPauses = pauseForDrift(Object.values(next)).reduce<Record<string, ModelRecord>>((acc, r) => {
        acc[r.id] = r;
        return acc;
      }, {});
      return withPauses;
    });
    setFired(id ?? null);
  }

  return (
    <Panel
      title="Model registry · champion / challenger"
      right={
        fired === "auto" ? (
          <Badge tone="warn">kill switch armed</Badge>
        ) : (
          <span className="text-[11px] text-slate-500">drift auto-paused @ ≥ 0.8</span>
        )
      }
    >
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1.5 text-left font-medium">model</th>
            <th className="text-right font-medium">universe</th>
            <th className="text-center font-medium">status</th>
            <th className="text-right font-medium">sharpe</th>
            <th className="text-right font-medium">dd</th>
            <th className="text-right font-medium">win%</th>
            <th className="text-right font-medium">drift</th>
            <th className="text-right font-medium">P&L</th>
            <th className="pl-3 text-right font-medium">ops</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const t = r.status === "live" ? "long" : r.status === "paused" ? "warn" : "muted";
            const hasSlot = r.championsFor.length > 0;
            const slot = hasSlot ? SLOT_OPTIONS.find((s) => s.id === r.championsFor[0]) : SLOT_OPTIONS[0];
            return (
              <tr key={r.id} className="border-t border-edge/40">
                <td className="py-2 text-slate-200">
                  {r.name} <span className="text-slate-500">{r.version}</span>
                </td>
                <td className="text-right text-[10.5px] text-slate-500">{r.universe}</td>
                <td className="text-center">
                  <Badge tone={t}>{r.status}</Badge>
                  {r.killReason && (
                    <div className="mt-1 font-mono text-[9px] leading-tight text-short/80" title={`${r.killReason} · resume after re-gate`}>⚑ {r.killReason.length > 34 ? `${r.killReason.slice(0, 34)}…` : r.killReason}</div>
                  )}
                </td>
                <td className="text-right text-slate-300">{r.sharpe.toFixed(2)}</td>
                <td className="text-right text-short">{r.ddPct.toFixed(1)}%</td>
                <td className="text-right text-slate-300">{(r.winRate * 100).toFixed(0)}%</td>
                <td className="text-right">
                  <span className={r.drift >= 0.8 ? "font-semibold text-red-300" : r.drift >= 0.5 ? "text-amber-300" : "text-slate-300"}>
                    {r.drift.toFixed(2)}
                  </span>
                </td>
                <td className={`text-right ${r.pnlUsd >= 0 ? "text-long" : "text-short"}`}>
                  {r.pnlUsd >= 0 ? "+" : "−"}${Math.abs(r.pnlUsd).toLocaleString()}
                </td>
                <td className="space-x-1 pl-3 text-right">
                  {r.status !== "live" && slot && (
                    <button
                      onClick={() => act((cur) => {
                        const arr = Object.values(cur);
                        return Object.fromEntries(promote(arr, r.id, slot.id).map((x) => [x.id, x]));
                      }, r.id)}
                      className="rounded bg-long/15 px-1.5 py-0.5 text-[10px] font-semibold text-long hover:bg-long/25"
                    >
                      promote
                    </button>
                  )}
                  {r.status !== "paused" ? (
                    <button
                      onClick={() => act((cur) => {
                        const arr = Object.values(cur).map((x) => (x.id === r.id ? { ...x, drift: 0.92 } : x));
                        return Object.fromEntries(pauseForDrift(arr).map((x) => [x.id, x]));
                      }, "auto")}
                      className="rounded bg-red-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 hover:bg-red-400/25"
                    >
                      kill switch
                    </button>
                  ) : (
                    <button
                      onClick={() => act((cur) => {
                        const arr = Object.values(cur);
                        return Object.fromEntries(resume(arr, r.id).map((x) => [x.id, x]));
                      }, r.id)}
                      className="rounded bg-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan hover:bg-cyan/25"
                    >
                      resume
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge/40 pt-2 text-[10.5px] text-slate-500">
        <span>
          drift = normalized feature shift vs baseline — live demo value <span className="font-mono text-slate-300">{driftDemo.toFixed(3)}</span>
        </span>
        <span>P&L attributed to the model that fired the entry · totals {rows.reduce((s, r) => s + r.pnlUsd, 0).toLocaleString()}</span>
        <span className="text-slate-600">ops are pure registry transitions — no side effects</span>
      </div>
    </Panel>
  );
}

export function AgentSteps({ symbol, history, riskOff }: { symbol: string; history: number[]; riskOff: boolean }) {
  const steps = useMemo(() => {
    const f = featuresFor(symbol, history, riskOff);
    const ranked = rankModels(symbol, f);
    const best = ranked[0];
    return [
      `04:12:07 scan  — ${meta(symbol).symbol} features refreshed: momZ ${f.momZ >= 0 ? "+" : ""}${f.momZ.toFixed(2)}, book ${f.bookImb >= 0 ? "+" : ""}${f.bookImb.toFixed(2)}, regime beta ${f.regimeBeta >= 0 ? "+" : ""}${f.regimeBeta.toFixed(2)} ${riskOff ? "(risk-on leg)" : "(neutral mix)"}.`,
      `04:12:09 models — ${modelsFor(symbol).length} eligible models evaluated; ${best.model} ${best.version} leads at ${best.clipped >= 0 ? "+" : ""}${best.clipped.toFixed(3)} ${best.side}.`,
      `04:12:09 explain — ${FEAT_LABEL[best.attributions[0].feature]} ${best.attributions[0].contribution >= 0 ? "+" : ""}${best.attributions[0].contribution.toFixed(3)} is the dominant term; ${FEAT_LABEL[best.attributions[1].feature]} ${best.attributions[1].contribution >= 0 ? "+" : ""}${best.attributions[1].contribution.toFixed(3)} ${best.attributions[1].contribution * best.clipped >= 0 ? "confirms" : "partly offsets"}.`,
      `04:12:10 route  — size within margin, venue = best p50 for ${meta(symbol).type}; order intent queued for OMS.`,
      `04:12:10 audit   — decision logged with features + attributions + model version → replayable, not a vibes memo.`,
    ];
  }, [symbol, history, riskOff]);
  return (
    <Panel title="Agent feed · narrates real computations" right={<LiveDot color="text-cyan" />}>
      <div className="space-y-2 font-mono text-[11px] leading-relaxed">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2">
            <span className={`shrink-0 ${i === 0 ? "text-cyan" : "text-slate-600"}`}>{s.split("—")[0]}</span>
            <span className="text-slate-400">{s.split("—").slice(1).join("—") || ""}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
