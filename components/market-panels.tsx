"use client";

import { Panel } from "./ui";
import type { MarketCore, Ticker } from "../lib/market";
import { regimeLabel, CORR, CORR_LABELS } from "../lib/market";
import { meta, typeLabel } from "../lib/instruments";
import type { MarketClock } from "../lib/sessions";
import type { EventState } from "../lib/macro";

const STATE_STYLE: Record<string, string> = {
  calm: "bg-long/12 text-long ring-long/35",
  chop: "bg-amber/12 text-amber ring-amber/35",
  riskoff: "bg-short/12 text-short ring-short/40",
};

export function RegimePanel({ core, now }: { core: MarketCore; now: number }) {
  const r = core.regime;
  const mins = Math.max(0, Math.round((now - r.since) / 60000));
  const mult = r.volState === "calm" ? 0.75 : r.volState === "chop" ? 1.3 : 2.1;
  return (
    <Panel title="Regime" accent right={<span className="font-mono text-[10px] text-slate-500">tick {core.tickNo}</span>}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 font-mono text-[10.5px] tracking-wider ring-1 ${STATE_STYLE[r.volState]}`}>
          {r.volState.toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-slate-300">
          trend {r.trend > 0 ? "▲ risk-on" : r.trend < 0 ? "▼ risk-off" : "◼ neutral"}
        </span>
        <span className="font-mono text-[11px] text-slate-500">σ ×{mult.toFixed(2)}</span>
      </div>
      <div className="mt-2 text-[12.5px] text-slate-300">{regimeLabel(r)}</div>
      <div className="mt-1 font-mono text-[10.5px] text-slate-500">
        held {mins < 1 ? "<1m" : `${mins}m`} · one shared shock per tick drives every class
      </div>
      {core.armedGap !== 0 && (
        <div className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium ${
          core.armedGap < 0 ? "border-short/40 bg-short/10 text-short" : "border-long/40 bg-long/10 text-long"
        }`}>
          ⚡ print gap {core.armedGap < 0 ? "−" : "+"}
          {Math.abs(core.armedGap * 100).toFixed(2)}% · havens inverting
        </div>
      )}
    </Panel>
  );
}

export function CorrelationHeat() {
  return (
    <Panel title="Asset-class correlation" accent>
      <div className="grid gap-px overflow-hidden rounded-lg ring-1 ring-edge" style={{ gridTemplateColumns: `1.9fr repeat(${CORR_LABELS.length}, 1fr)` }}>
        <div />
        {CORR_LABELS.map((l) => (
          <div key={l} className="bg-surface-2 px-1.5 py-1 text-center font-mono text-[9.5px] text-slate-400">{l}</div>
        ))}
        {CORR.map((row, i) => (
          <div key={CORR_LABELS[i]} className="contents">
            <div className="bg-surface-2 flex items-center px-1.5 font-mono text-[9.5px] text-slate-400">{CORR_LABELS[i]}</div>
            {row.map((v, j) => (
              <div
                key={j}
                className="py-1.5 text-center font-mono text-[9.5px]"
                style={{
                  backgroundColor:
                    i === j ? "rgba(148,163,184,0.12)" :
                    v > 0 ? `rgba(16,185,129,${Math.abs(v) * 0.4})` : `rgba(244,63,94,${Math.abs(v) * 0.4})`,
                  color: "rgba(226,232,240,0.9)",
                }}
              >
                {v > 0 ? "+" : ""}{v.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-slate-600">exposure-weighted · green = co-moves risk-on · red = hedge</div>
    </Panel>
  );
}

const chip = (style: string, text: string) => (
  <span className={`rounded-md px-2 py-0.5 font-mono text-[10.5px] ring-1 ${style}`}>{text}</span>
);
const OPEN = "bg-long/10 text-long ring-long/30";
const CLOSED = "bg-slate-500/10 text-slate-500 ring-edge";

export function SessionPanel({ clock }: { clock: MarketClock }) {
  const eq = clock.equity;
  const rows = [
    {
      label: "Equities · RTH",
      window: clock.halfDay ? "09:30–12:00 half-day" : "09:30–16:00",
      chip: eq === "open" ? chip(OPEN, "RTH OPEN") : eq === "lunch" ? chip("bg-cyan/10 text-cyan ring-cyan/30", "RTH · PM") : eq === "pre" ? chip("bg-amber/10 text-amber ring-amber/30", "PRE-MKT") : chip(CLOSED, "CLOSED"),
    },
    { label: "Futures · 23h", window: "Sun 17:00 → Fri 17:00", chip: clock.futuresOpen ? chip(OPEN, "OPEN") : chip(CLOSED, "CLOSED") },
    { label: "FX · 24×5", window: "→ Fri 22:00", chip: clock.fxOpen ? chip(OPEN, "OPEN") : chip(CLOSED, "CLOSED") },
    { label: "Crypto · 24/7", window: "always live", chip: chip(OPEN, "OPEN") },
  ];
  const inMin = Math.max(0, clock.nextChangeIn / 60000);
  return (
    <Panel title="Sessions" accent>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-slate-300">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="hidden font-mono text-[10px] text-slate-600 sm:inline">{r.window}</span>
              {r.chip}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-edge pt-2 font-mono text-[11px] text-slate-400">
        next boundary · {clock.nextLabel} · <span className="text-cyan">{inMin < 1 ? "<1m" : `${Math.floor(inMin)}m`}</span>
      </div>
    </Panel>
  );
}

export function MacroPanel({ state, events, now }: { state: EventState; events: { id: string; label: string; kind: string; ts: number; volMult: number; bias: number }[]; now: number }) {
  const phaseStyle =
    state.phase === "live"
      ? "border-short/45 bg-short/10"
      : state.phase === "pre"
        ? "border-amber/45 bg-amber/10"
        : state.phase === "post"
          ? "border-cyan/35 bg-cyan/8"
          : "border-edge bg-surface-2/40";
  const phaseText =
    state.phase === "live"
      ? state.event ? `● ${state.event.kind} PRINTING · vol ×3 · gap armed` : ""
      : state.phase === "pre"
        ? state.event ? `⏱ ${state.event.kind} in ${state.countdown} · pre-vol ×2.2 on the complex` : ""
        : state.phase === "post"
          ? state.event ? `${state.event.kind} post · gap applied · decay ×1.6` : ""
          : "quiet calendar";
  return (
    <Panel
      title="Macro calendar"
      accent
      right={<span className="font-mono text-[10px] text-slate-500">next: {state.countdown}</span>}
    >
      <div className={`mb-3 rounded-lg border px-3 py-2 text-[12px] font-medium text-slate-200 ${phaseStyle}`}>
        {phaseText || "no events in the pre-window · base vol ×1.0"}
      </div>
      <div className="space-y-1.5">
        {events.slice(0, 5).map((e) => (
          <div key={e.id} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2">
              <span className={`w-11 rounded px-1.5 py-0.5 text-center font-mono text-[10px] ring-1 ${
                e.kind === "FOMC" ? "bg-short/10 text-short ring-short/30" : "bg-slate-500/10 text-slate-300 ring-edge"
              }`}>
                {e.kind}
              </span>
              <span className="text-slate-300">{e.label}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${e.bias < 0 ? "bg-short" : e.bias > 0 ? "bg-long" : "bg-slate-500"}`} />
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {(() => {
                const s = Math.max(0, Math.round((e.ts - now) / 60000));
                return s > 72 ? `${Math.round(s / 60 / 24)}d` : s > 1 ? `${s}m` : `${Math.max(0, Math.round((e.ts - now) / 1000))}s`;
              })()}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const ORDER = ["future", "treasury", "fx", "intl", "crypto", "equity", "etf"] as const;

export function CrossAssetBoard({ tickers }: { tickers: Ticker[] }) {
  const groups = ORDER
    .map((kind) => ({ kind, rows: tickers.filter((t) => t.type === kind) }))
    .filter((g) => g.rows.length > 0);
  return (
    <Panel title="Cross-asset tape" accent right={<span className="font-mono text-[10px] text-slate-500">{tickers.length} instruments</span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-edge font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <th className="py-1.5 pr-3 font-medium">Instrument</th>
              <th className="py-1.5 pr-3 font-medium">Class</th>
              <th className="py-1.5 pr-3 font-medium">Session</th>
              <th className="py-1.5 pr-3 text-right font-medium">Bid</th>
              <th className="py-1.5 pr-3 text-right font-medium">Ask</th>
              <th className="py-1.5 pr-3 text-right font-medium">Last</th>
              <th className="py-1.5 text-right font-medium">Δ session</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <BoardGroup key={g.kind} label={typeLabel[g.kind]} rows={g.rows} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BoardGroup({ label, rows }: { label: string; rows: Ticker[] }) {
  return (
    <>
      <tr>
        <td colSpan={7} className="pt-2.5 pb-1 pr-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-slate-500">
          {label}
        </td>
      </tr>
      {rows.map((t) => {
        const m = meta(t.symbol);
        return (
          <tr key={t.symbol} className="border-b border-edge/50 last:border-0">
            <td className="py-1.5 pr-3">
              <span className="font-medium text-slate-200">{t.symbol}</span>
              <span className="ml-2 hidden text-[11px] text-slate-500 md:inline">{t.name}</span>
              {m.haven > 0 && <span className="ml-1.5 rounded bg-slate-500/10 px-1 font-mono text-[9px] text-slate-400 ring-1 ring-edge">haven</span>}
            </td>
            <td className="py-1.5 pr-3 font-mono text-[10.5px] text-slate-500">{typeLabel[t.type]}</td>
            <td className="py-1.5 pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-long inline-block" />
              <span className="ml-1.5 font-mono text-[10px] text-slate-500">{sessionLabel(t.type)}</span>
            </td>
            <td className="py-1.5 pr-3 text-right font-mono text-[11.5px] text-slate-400">{t.bid.toFixed(t.decimals)}</td>
            <td className="py-1.5 pr-3 text-right font-mono text-[11.5px] text-slate-400">{t.ask.toFixed(t.decimals)}</td>
            <td className="py-1.5 pr-3 text-right font-mono text-[12px] text-slate-100">{t.price.toLocaleString(undefined, { minimumFractionDigits: t.decimals, maximumFractionDigits: t.decimals })}</td>
            <td className="py-1.5 text-right font-mono text-[11.5px]">
              <span className={t.change >= 0 ? "text-long" : "text-short"}>
                {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function sessionLabel(type: Ticker["type"]): string {
  return type === "crypto" ? "24/7" : type === "future" ? "23h" : type === "fx" ? "24×5" : "RTH";
}
