"use client";

import { useMemo, useState } from "react";
import { Panel, LiveDot, Badge } from "./ui";
import { usd } from "./panels";
import {
  type OmOrder,
  type OmFill,
  type OmSide,
  type OmType,
  type OmTif,
  rejectReason,
  queueOf,
  slippageBps,
  orderAgeSec,
} from "../lib/oms";
import { meta, UNIVERSE } from "../lib/instruments";
import type { Ticker } from "../lib/market";
import { bestVenue } from "../lib/brokers";
import { moneyFor } from "../lib/money";
import { seedPositions } from "../lib/positions";
import { seedFills } from "../lib/registry";

const TYPES: { id: OmType; label: string; hint: string }[] = [
  { id: "LMT", label: "LMT", hint: "maker at your price" },
  { id: "STP", label: "STP", hint: "taker on breach" },
  { id: "STP_LMT", label: "STP_LMT", hint: "trigger → limit" },
  { id: "BRK", label: "BRK", hint: "bracket child" },
  { id: "OCO", label: "OCO", hint: "one-cancels-other" },
  { id: "ICE", label: "ICE", hint: "hidden size" },
];

const VENUE_DEPTH: Record<string, number[]> = {
  OKX: [420, 300, 560, 210, 180],
  Bybit: [380, 260, 510, 190, 240],
  IB: [24, 12, 40, 8, 16],
};

const STATUS_TONE: Record<OmOrder["status"], "long" | "short" | "ai" | "warn" | "ok" | "muted" | "neutral"> = {
  WORKING: "ok",
  QUEUED: "neutral",
  PARTIAL: "ai",
  FILLED: "long",
  CANCELED: "muted",
  REJECTED: "warn",
};

function Num({ v, set, ph }: { v: number; set: (n: number) => void; ph: string }) {
  return (
    <input
      value={v || ""}
      placeholder={ph}
      onChange={(e) => set(Number(e.target.value) || 0)}
      className="w-full rounded-md border border-edge bg-background/70 px-2 py-1.5 font-mono text-[12px] tabular-nums outline-none focus:border-accent/60"
    />
  );
}

export function Ticket({ tickers, now, onSend }: { tickers: Ticker[]; now: number; onSend: (o: OmOrder) => void }) {
  const symbols = useMemo(() => UNIVERSE.slice(0, 18).map((m) => m.symbol), []);
  const [sym, setSym] = useState("NVDA");
  const [side, setSide] = useState<OmSide>("BUY");
  const [type, setType] = useState<OmType>("LMT");
  const [qty, setQty] = useState(10);
  const [px, setPx] = useState(0);
  const [tif, setTif] = useState<OmTif>("GTC");

  const m = meta(sym);
  const tick = tickers.find((t) => t.symbol === sym);
  const refPx = tick ? tick.price : 100;
  const limit = px || refPx;
  const venue = bestVenue(m.type)?.name ?? "IB";
  const lat = venue === "IB" ? 9 : 12;
  const notional = limit * qty * m.multiplier;
  const slip = slippageBps(notional, m.spreadBps, lat);
  const queue = queueOf({ id: sym + side + qty, venue } as OmOrder, VENUE_DEPTH[venue] ?? [10, 10]);
  const bp = 2_436_000;
  const wouldReject = rejectReason(
    { id: "ticket", symbol: sym, side, type, qty, limitPx: type === "LMT" || type === "ICE" ? limit : (type === "STP" || type === "STP_LMT" ? limit : null), stopPx: type === "STP" || type === "STP_LMT" ? limit : null, tif, status: "QUEUED", venue, t0: now, avgPx: 0, filledQty: 0 } as OmOrder,
    { now, buyingPowerUsd: bp },
  );

  const commit = () => {
    const o: OmOrder = {
      id: `NX-${(9100 + Math.floor((now % 997))).toString(36).toUpperCase()}`,
      symbol: sym,
      side,
      type,
      qty: Math.max(m.minQty, qty),
      filledQty: 0,
      avgPx: 0,
      limitPx: type === "LMT" || type === "ICE" ? limit : (type === "STP_LMT" ? limit : null),
      stopPx: type === "STP" || type === "STP_LMT" ? limit : null,
      displayQty: type === "ICE" ? Math.max(1, Math.round(qty / 6)) : undefined,
      tif,
      status: "QUEUED",
      venue,
      t0: now,
      modelId: undefined,
    };
    onSend(o);
  };

  return (
    <Panel title="Order ticket" icon="➜" right={<LiveDot color="var(--color-accent)" />} className="bg-surface-2/40">
      <div className="flex flex-col gap-2.5 p-3.5 text-[12px]">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Instrument</div>
            <select
              value={sym}
              onChange={(e) => setSym(e.target.value)}
              className="w-full rounded-md border border-edge bg-background/70 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-accent/60"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Side · {meta(sym).name}</div>
            <div className="flex gap-1.5">
              {(["BUY", "SELL"] as OmSide[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold ${side === s ? (s === "BUY" ? "bg-long/20 text-long ring-1 ring-long/40" : "bg-short/20 text-short ring-1 ring-short/40") : "bg-surface/60 text-slate-400 ring-1 ring-edge"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
            <span>Type</span>
            <span className="font-mono normal-case tracking-normal">{TYPES.find((t) => t.id === type)?.hint}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${type === t.id ? "bg-accent/15 text-accent-2 ring-accent/40" : "bg-surface/60 text-slate-400 ring-edge hover:text-slate-200"}`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Qty · min {m.minQty}</div>
            <Num v={qty} set={setQty} ph="qty" />
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">{type === "STP" ? "Stop" : "Limit"} · {m.decimals}dp</div>
            <Num v={px} set={setPx} ph={refPx.toFixed(m.decimals)} />
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">TIF</div>
            <select
              value={tif}
              onChange={(e) => setTif(e.target.value as OmTif)}
              className="w-full rounded-md border border-edge bg-background/70 px-2 py-1.5 font-mono text-[12px] outline-none"
            >
              <option>GTC</option>
              <option>IOC</option>
              <option>FOK</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md bg-edge/60">
          {[
            { k: "venue", v: venue },
            { k: "est. slip", v: `${slip.toFixed(1)}bps`, warn: slip > 2 },
            { k: "queue", v: `#${queue.position}` },
            { k: "wait", v: `${(queue.expectedWaitMs / 1000).toFixed(1)}s` },
          ].map((r) => (
            <div key={r.k} className="bg-surface px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-muted">{r.k}</div>
              <div className={`font-mono text-[11px] tabular-nums ${r.warn ? "text-amber" : "text-slate-200"}`}>{r.v}</div>
            </div>
          ))}
        </div>

        {wouldReject ? (
          <div className="rounded-md border border-short/40 bg-short/10 px-2.5 py-2 text-[11px] text-short" title="checked against V5 buying power + session + min-size rules">
            ⚠ would reject — {wouldReject}
          </div>
        ) : (
          <div className="rounded-md border border-edge bg-background/50 px-2.5 py-2 font-mono text-[10.5px] text-slate-400">
            ref {tick?.price.toFixed(m.decimals) ?? "—"} · notional {usd(notional)} · BP 2,436K → ok
          </div>
        )}

        <button
          onClick={commit}
          disabled={!!wouldReject}
          className={`rounded-md px-3 py-2 text-[12px] font-bold tracking-wide ${wouldReject ? "cursor-not-allowed bg-surface text-slate-600" : side === "BUY" ? "bg-long/25 text-long ring-1 ring-long/50 hover:bg-long/35" : "bg-short/25 text-short ring-1 ring-short/50 hover:bg-short/35"}`}
        >
          {side} {qty} {sym} · {type}
        </button>
      </div>
    </Panel>
  );
}

function TypeChip({ t }: { t: OmType }) {
  const map: Record<OmType, string> = {
    LMT: "bg-accent/12 text-accent-2 ring-accent/30",
    STP: "bg-amber/12 text-amber ring-amber/35",
    STP_LMT: "bg-amber/12 text-amber ring-amber/35",
    BRK: "bg-short/12 text-short ring-short/35",
    OCO: "bg-cyan/12 text-cyan ring-cyan/35",
    ICE: "bg-long/12 text-long ring-long/30",
  };
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ring-1 ${map[t]}`}>{t}</span>;
}

export function WorkingOrders({ orders, now, onCancel, onAmend }: { orders: OmOrder[]; now: number; onCancel: (id: string) => void; onAmend: (id: string, newLimit: number) => void }) {
  const active = orders.filter((o) => ["WORKING", "QUEUED", "PARTIAL"].includes(o.status));
  const done = orders.filter((o) => ["FILLED", "CANCELED", "REJECTED"].includes(o.status)).slice(0, 12);
  const rows = [...active, ...done];
  return (
    <Panel
      title={`Working orders (${active.length}) · recent (${orders.length - active.length})`}
      icon="≣"
      right="cancellations cascade across BRK/OCO legs"
      className="bg-surface-2/40"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">ref</th>
              <th className="font-medium">sym</th>
              <th className="font-medium">type</th>
              <th className="text-right font-medium">qty</th>
              <th className="text-right font-medium">px / stop</th>
              <th className="text-right font-medium">status</th>
              <th className="text-right font-medium">q#·wait</th>
              <th className="text-right font-medium">age</th>
              <th className="text-right font-medium">model</th>
              <th className="pl-3 text-right font-medium">ops</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const m = meta(o.symbol);
              const q = queueOf(o, VENUE_DEPTH[o.venue] ?? [10, 5]);
              const activeRow = ["WORKING", "QUEUED", "PARTIAL"].includes(o.status);
              return (
                <tr key={o.id} className="border-b border-edge/30">
                  <td className="px-3 py-2 font-mono text-slate-300">{o.id}</td>
                  <td className="space-y-0.5">
                    <span className="font-mono text-slate-100">{o.symbol}</span>{" "}
                    <span className={o.side === "BUY" ? "text-long" : "text-short"}>{o.side}</span>
                    {o.type === "ICE" && o.displayQty !== undefined && (
                      <span className="ml-1 font-mono text-[9.5px] text-muted" title="iceberg: shown < actual">
                        show {o.displayQty}/{o.qty}
                      </span>
                    )}
                  </td>
                  <td>
                    <TypeChip t={o.type} />
                  </td>
                  <td className="text-right font-mono tabular-nums text-slate-200">
                    {o.filledQty > 0 && <s className="text-slate-500">{o.filledQty}</s>} {o.qty - o.filledQty}
                  </td>
                  <td className="text-right font-mono tabular-nums text-slate-300">
                    {o.limitPx !== null ? o.limitPx.toFixed(m.decimals) : "—"} / {o.stopPx !== null ? o.stopPx.toFixed(m.decimals) : "—"}
                  </td>
                  <td className="text-right">
                    <Badge tone={STATUS_TONE[o.status]}>{o.status.toLowerCase()}</Badge>
                    {o.rejectReason && <div className="mt-0.5 font-mono text-[9px] text-short/80">{o.rejectReason}</div>}
                  </td>
                  <td className="text-right font-mono text-[10.5px] tabular-nums text-slate-400">
                    {activeRow ? `#${q.position} · ${(q.expectedWaitMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="text-right font-mono tabular-nums text-slate-400">{orderAgeSec(o, now)}s</td>
                  <td className="text-right font-mono text-[10px] text-accent-2/80">{o.modelId ?? "manual"}</td>
                  <td className="space-x-1 pl-3 text-right">
                    {activeRow && (
                      <>
                        <button
                          onClick={() => onAmend(o.id, (o.limitPx ?? 0) * (o.side === "BUY" ? 0.995 : 1.005))}
                          className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-edge hover:text-slate-100"
                        >
                          amend
                        </button>
                        <button
                          onClick={() => onCancel(o.id)}
                          className="rounded bg-short/15 px-1.5 py-0.5 text-[10px] font-semibold text-short ring-1 ring-short/30 hover:bg-short/25"
                        >
                          cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ExecReports({ fills, now }: { fills: OmFill[]; now: number }) {
  const rows = [...fills].reverse().slice(0, 14);
  return (
    <Panel
      title={`Execution reports (${fills.length})`}
      icon="✓"
      right="venue · latency · slippage vs signal · model attribution (V6 → V8 loop)"
      className="bg-surface-2/40"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">order</th>
              <th className="font-medium">sym · side</th>
              <th className="text-right font-medium">qty @ px</th>
              <th className="text-right font-medium">role</th>
              <th className="text-right font-medium">venue</th>
              <th className="text-right font-medium">latency</th>
              <th className="text-right font-medium">slippage</th>
              <th className="text-right font-medium">fee</th>
              <th className="text-right font-medium">t0 → fill</th>
              <th className="pl-3 text-right font-medium">model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={i} className="border-b border-edge/30">
                <td className="px-3 py-2 font-mono text-slate-300">{f.orderId}</td>
                <td className="font-mono text-slate-100">
                  {f.symbol} <span className={f.side === "BUY" ? "text-long" : "text-short"}>{f.side}</span>
                </td>
                <td className="text-right font-mono tabular-nums text-slate-200">
                  {f.qty} @ {f.px}
                </td>
                <td className="text-right">
                  <Badge tone={f.role === "MAKER" ? "ok" : "warn"}>{f.role}</Badge>
                </td>
                <td className="text-right font-mono text-slate-300">{f.venue}</td>
                <td className="text-right font-mono tabular-nums text-slate-300">{f.latencyMs}ms</td>
                <td className={`text-right font-mono tabular-nums ${f.slippageBps > 1.5 ? "text-amber" : "text-slate-300"}`}>{f.slippageBps.toFixed(1)}bps</td>
                <td className="text-right font-mono tabular-nums text-slate-400">${f.feeUsd.toFixed(2)}</td>
                <td className="text-right font-mono text-[10.5px] tabular-nums text-slate-400">T0+{Math.max(0, Math.round((now - f.ts) / 1000))}s</td>
                <td className="pl-3 text-right font-mono text-[10px] text-accent-2/80">{f.modelId ?? "manual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Blotter() {
  const book = useMemo(() => seedPositions(), []);
  const ib = bestVenue("equity");
  const money = ib ? moneyFor(ib, book.positions) : null;
  const realized = useMemo(() => seedFills().reduce((s, f) => s + f.pnlUsd, 0), []);
  const unreal = book.positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  return (
    <Panel title="Blotter — day reconciliation" icon="$" right="realized (V6 fills) · unrealized (V7 MTM) · interest + fees (V5 money)" className="bg-surface-2/40">
      <div className="grid grid-cols-2 gap-px bg-edge/60 md:grid-cols-5">
        {[
          { k: "realized (day, V6 loop)", v: usd(realized), tone: realized >= 0 ? "text-long" : "text-short" },
          { k: "unrealized MTM", v: usd(unreal), tone: unreal >= 0 ? "text-long" : "text-short" },
          { k: "interest (30d est.)", v: money ? `−${usd(money.interest30d)}` : "—", tone: "text-amber" },
          { k: "fees (30d est.)", v: money ? `−${usd(money.fees30d)}` : "—", tone: "text-amber" },
          { k: "buying power left", v: money ? usd(money.buyingPower) : "—", tone: "text-slate-200" },
        ].map((r) => (
          <div key={r.k} className="bg-surface px-3 py-2.5">
            <div className="text-[9.5px] uppercase tracking-wider text-muted">{r.k}</div>
            <div className={`font-mono text-[13px] font-semibold tabular-nums ${r.tone}`}>{r.v}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-edge px-3.5 py-2 font-mono text-[10.5px] text-slate-500">
        net = realized + unrealized − interest − fees · {money ? `equity ${usd(money.equity)} · used {Math.round(money.usedPct)}% of ${usd(ib!.creditLimitUsd)}` : ""} · reconcile at 16:00 ET
      </div>
    </Panel>
  );
}

export function OmsDeck({
  tickers,
  now,
  orders,
  fills,
  onSend,
  onCancel,
  onAmend,
}: {
  tickers: Ticker[];
  now: number;
  orders: OmOrder[];
  fills: OmFill[];
  onSend: (o: OmOrder) => void;
  onCancel: (id: string) => void;
  onAmend: (id: string, newLimit: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Ticket tickers={tickers} now={now} onSend={onSend} />
        <div className="xl:col-span-2">
          <WorkingOrders orders={orders} now={now} onCancel={onCancel} onAmend={onAmend} />
        </div>
      </div>
      <ExecReports fills={fills} now={now} />
      <Blotter />
    </div>
  );
}
