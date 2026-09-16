"use client";

import { ASSET_TYPES, BROKERS, coverage, type Broker, type BrokerStatus, venuesFor } from "../lib/brokers";
import { typeLabel, type InstrumentType } from "../lib/instruments";
import { reconcile } from "../lib/money";
import { seedPositions } from "../lib/positions";
import { LiveDot, Panel } from "./ui";

const TONE: Record<BrokerStatus, { dot: string; text: string }> = {
  online: { dot: "text-long", text: "text-long" },
  degraded: { dot: "text-amber", text: "text-amber" },
  maintenance: { dot: "text-slate-400", text: "text-slate-400" },
};

function statusOf(b: Broker) {
  return b.status === "online" ? TONE.online : b.status === "degraded" ? TONE.degraded : TONE.maintenance;
}

export function BrokerCard({ broker }: { broker: Broker }) {
  const t = statusOf(broker);
  const used = Math.min(100, Math.round((broker.cashUsd / Math.max(1, broker.creditLimitUsd)) * 100));
  return (
    <Panel title={broker.name} accent={false} right={<span className={`flex items-center gap-1.5 text-[11px] font-medium ${t.text}`}><LiveDot color={t.dot} />{broker.status}</span>}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-slate-300 ring-1 ring-edge/40">{broker.short}</span>
          <span className="text-slate-400">{broker.type === "unified" ? "unified broker" : "crypto venue"}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{broker.region}</span>
          {broker.flex && <span className="rounded-md bg-cyan/10 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-cyan">FLEX</span>}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">p50 / p99</div>
            <div className="font-mono text-[13px] font-semibold text-slate-200">{broker.p50ms}<span className="text-slate-500">·</span>{broker.p99ms}ms</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">fee</div>
            <div className="font-mono text-[13px] font-semibold text-slate-200">{broker.feeBps}bp</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">margin rate</div>
            <div className="font-mono text-[13px] font-semibold text-slate-200">{(broker.marginRate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">cash</div>
            <div className="font-mono text-[13px] font-semibold text-slate-200">${(broker.cashUsd / 1000).toFixed(0)}k</div>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[10.5px] text-slate-400">
            <span>credit utilization</span>
            <span className="font-mono">{used}% of ${(broker.creditLimitUsd / 1000).toFixed(0)}k</span>
          </div>
          <div className="h-1 rounded bg-slate-800">
            <div className="h-1 rounded bg-accent-2" style={{ width: `${used}%` }} />
          </div>
        </div>
        <p className="text-[11.5px] leading-relaxed text-slate-500">{broker.note}</p>
      </div>
    </Panel>
  );
}

const TYPE_ICON: Record<InstrumentType, string> = {
  equity: "≡",
  etf: "▤",
  future: "Δ",
  treasury: "§",
  fx: "ƒ",
  intl: "◎",
  crypto: "₿",
};

export function CapabilityMatrix() {
  return (
    <Panel title="Capability matrix" right={<span className="text-[11px] text-slate-500">venue × asset class</span>}>
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1.5 text-left font-medium">venue</th>
            {ASSET_TYPES.map((t) => (
              <th key={t} className="px-1 text-right font-medium" title={typeLabel[t]}>{TYPE_ICON[t]}</th>
            ))}
            <th className="pl-3 text-right font-medium">routes</th>
          </tr>
        </thead>
        <tbody>
          {BROKERS.map((b) => (
            <tr key={b.id} className="border-t border-edge/40">
              <td className="py-1.5 text-slate-300">{b.short}</td>
              {ASSET_TYPES.map((t) => {
                const ok = b.capabilities.includes(t);
                return (
                  <td key={t} className={`px-1 text-center ${ok ? "text-long" : "text-slate-700"}`}>
                    {ok ? "●" : "·"}
                  </td>
                );
              })}
              <td className="pl-3 text-right text-slate-400">
                {b.capabilities.map((t) => venuesFor(t).length).join("+")}{b.flex ? " · FLEX" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge/40 pt-2 text-[10.5px] text-slate-500">
        {ASSET_TYPES.map((t) => (
          <span key={t}>{TYPE_ICON[t]} {typeLabel[t].toLowerCase()}</span>
        ))}
        <span className="text-slate-600">● = tradable · · = unsupported</span>
      </div>
    </Panel>
  );
}

export function MoneyModel() {
  const lines = reconcile(BROKERS, { ibkr: seedPositions().positions.slice(0, 4) });
  const l = lines.find((x) => x.broker === "IBKR") ?? lines[0];
  const cov = coverage();
  return (
    <Panel title="Money model · IBKR" right={<span className="text-[11px] font-medium text-cyan">FLEX-style daily</span>}>
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "equity", v: `$${Math.round(l.equity).toLocaleString()}` },
          { k: "initial margin", v: `$${Math.round(l.initialMargin).toLocaleString()}` },
          { k: "buying power", v: `$${Math.round(l.buyingPower).toLocaleString()}` },
          { k: "market value", v: `$${Math.round(l.marketValue).toLocaleString()}` },
          { k: "interest / 30d", v: `$${Math.round(l.interest).toLocaleString()}` },
          { k: "fees / 30d", v: `$${Math.round(l.fees).toLocaleString()}` },
        ].map((c) => (
          <div key={c.k} className="rounded-md bg-surface-2/60 p-2 ring-1 ring-edge/40">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{c.k}</div>
            <div className="font-mono text-[13.5px] font-semibold text-slate-100">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500">routing coverage — {cov.length} instruments, 0 unrouted</div>
        <div className="h-1 rounded bg-slate-800">
          <div className="h-1 w-full rounded bg-long/80" />
        </div>
        <div className="flex justify-between text-[10.5px] text-slate-500">
          <span>{cov.filter((c) => c.venues >= 1).length} / {cov.length} symbols ≥ 1 venue</span>
          <span>IBKR covers every non-crypto book · crypto to OKX/BYB/BGET</span>
        </div>
      </div>
    </Panel>
  );
}
