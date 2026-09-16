"use client";

import { useEffect, useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { OmsDeck } from "../../components/oms";
import { seedTickers, tickPrices, type Ticker } from "../../lib/market";
import type { OmOrder, OmFill } from "../../lib/oms";
import { omsTick } from "../../lib/oms";

const START = Date.now(); // module-level, evaluated once per load

interface OmsState {
  tickers: Ticker[];
  orders: OmOrder[];
  fills: OmFill[];
  now: number;
}

function seedState(start: number): OmsState {
  const t = seedTickers();
  const now = start;
  const orders: OmOrder[] = [
    { id: "NX-9001", symbol: "BTC-USDT", side: "BUY", type: "LMT", qty: 0.5, filledQty: 0, avgPx: 0, limitPx: 96120, stopPx: null, tif: "GTC", status: "WORKING", venue: "OKX", t0: now - 184_000, modelId: "fund-capt" },
    { id: "NX-9002", symbol: "ETH-USDT", side: "SELL", type: "ICE", qty: 12, filledQty: 4, avgPx: 3137.6, limitPx: 3141, stopPx: null, displayQty: 2, tif: "GTC", status: "PARTIAL", venue: "Bybit", t0: now - 76_000, modelId: "xvenue-arb" },
    { id: "NX-9003", symbol: "NVDA", side: "BUY", type: "STP", qty: 15, filledQty: 0, avgPx: 0, limitPx: null, stopPx: 1682, tif: "GTC", status: "WORKING", venue: "IB", t0: now - 41_000, modelId: "mom-4.2" },
    { id: "NX-9004", symbol: "SPY", side: "BUY", type: "OCO", qty: 20, filledQty: 0, avgPx: 0, limitPx: 511.2, stopPx: null, tif: "GTC", status: "WORKING", venue: "IB", t0: now - 120_000, parentId: "NX-9005", modelId: "mom-4.2" },
    { id: "NX-9005", symbol: "SPY", side: "BUY", type: "OCO", qty: 20, filledQty: 0, avgPx: 0, limitPx: 509.9, stopPx: null, tif: "GTC", status: "WORKING", venue: "IB", t0: now - 119_000, parentId: "NX-9004", modelId: "mom-4.2" },
    { id: "NX-9006", symbol: "ESU6", side: "SELL", type: "BRK", qty: 3, filledQty: 0, avgPx: 0, limitPx: null, stopPx: 5652, tif: "GTC", status: "WORKING", venue: "IB", t0: now - 22_000, parentId: "NX-9006R", modelId: "volarb-2" },
    { id: "NX-9007", symbol: "ESU6", side: "BUY", type: "LMT", qty: 3, filledQty: 3, avgPx: 5631, limitPx: 5631, stopPx: null, tif: "GTC", status: "FILLED", venue: "IB", t0: now - 95_000, modelId: "volarb-2" },
    { id: "NX-9008", symbol: "AAPL", side: "BUY", type: "LMT", qty: 400, filledQty: 0, avgPx: 0, limitPx: 208.95, stopPx: null, tif: "GTC", status: "REJECTED", venue: "IB", t0: now - 300_000, rejectReason: "buying power short $82,300" },
    { id: "NX-9009", symbol: "ZB", side: "SELL", type: "STP_LMT", qty: 5, filledQty: 0, avgPx: 0, limitPx: 10721, stopPx: 10716, tif: "GTC", status: "WORKING", venue: "IB", t0: now - 66_000 },
  ];
  const fills: OmFill[] = [
    { orderId: "NX-9007", symbol: "ESU6", side: "BUY", px: 5631, qty: 3, feeUsd: 3.42, slippageBps: 0.4, role: "MAKER", venue: "IB", latencyMs: 38, ts: now - 61_000, modelId: "volarb-2" },
    { orderId: "NX-8991", symbol: "SOL-USDT", side: "BUY", px: 295.1, qty: 90, feeUsd: 1.33, slippageBps: 1.8, role: "TAKER", venue: "OKX", latencyMs: 44, ts: now - 133_000, modelId: "fund-capt" },
    { orderId: "NX-8992", symbol: "SOL-USDT", side: "BUY", px: 295.6, qty: 60, feeUsd: 0.9, slippageBps: 2.1, role: "TAKER", venue: "Bybit", latencyMs: 61, ts: now - 168_000, modelId: "xvenue-arb" },
    { orderId: "NX-8993", symbol: "EUR/USD", side: "SELL", px: 1.1712, qty: 500_000, feeUsd: 0.59, slippageBps: 0.2, role: "MAKER", venue: "IB", latencyMs: 29, ts: now - 412_000 },
  ];
  return { tickers: t, orders, fills, now };
}

function step(prev: OmsState): OmsState {
  const ts = Date.now();
  const tickers = tickPrices(prev.tickers, { shock: 0.0006, riskOff: false });
  const touch = (sym: string, side: "BUY" | "SELL") => {
    const t = tickers.find((x) => x.symbol === sym);
    if (!t) return 0;
    return side === "BUY" ? t.ask : t.bid;
  };
  const out = omsTick(prev.orders, touch, 14, { now: ts, buyingPowerUsd: 2_436_000 });
  return { ...prev, tickers, now: ts, orders: out.orders, fills: [...out.fills, ...prev.fills].slice(0, 60) };
}

export default function OrdersPage() {
  const mounted = useMounted();
  const [st, setSt] = useState<OmsState>(seedState.bind(null, START));

  useEffect(() => {
    const h = window.setInterval(() => setSt((prev) => step(prev)), 3000);
    return () => window.clearInterval(h);
  }, []);

  if (!mounted) return <Splash detail="oms: working orders · execution reports · blotter" />;

  const { tickers, orders, fills, now } = st;
  const active = orders.filter((o) => ["WORKING", "QUEUED", "PARTIAL"].includes(o.status)).length;
  const rejected = orders.filter((o) => o.status === "REJECTED").length;
  const avgSlip = fills.length ? fills.reduce((s, f) => s + f.slippageBps, 0) / fills.length : 0;
  const fees = fills.reduce((s, f) => s + f.feeUsd, 0);

  const onSend = (o: OmOrder) => setSt((prev) => ({ ...prev, orders: [o, ...prev.orders].slice(0, 40) }));
  const onCancel = (id: string) =>
    setSt((prev) => {
      const target = prev.orders.find((x) => x.id === id);
      return {
        ...prev,
        orders: prev.orders.map((x) => {
          if (x.id === id) return { ...x, status: "CANCELED" as const, rejectReason: "cancelled by desk" };
          if (target && (x.parentId === id || (target.type === "OCO" && x.type === "OCO" && x.parentId === target.parentId))) {
            return { ...x, status: "CANCELED" as const, rejectReason: target.type === "OCO" ? "OCO sibling cancelled" : "bracket leg cancelled" };
          }
          return x;
        }),
      };
    });
  const onAmend = (id: string, newLimit: number) =>
    setSt((prev) => ({ ...prev, orders: prev.orders.map((x) => (x.id === id ? { ...x, limitPx: newLimit } : x)) }));

  return (
    <ConsoleShell tickers={tickers}>
      <div className="bg-surface/40 px-4 pt-3">
        <div className="flex items-center justify-between gap-4 overflow-x-auto border-b border-edge pb-3">
          <div className="shrink-0">
            <h1 className="font-mono text-[15px] font-bold text-slate-100">Orders — OMS</h1>
            <p className="text-[11px] text-muted">
              state machines · LMT / STP / BRK / OCO / ICE · two-sided touch · queue + slippage · exec reports w/ model attribution
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { k: "working", v: String(active), tone: "text-long" },
              { k: "fill ratio", v: `${orders.length ? Math.round((orders.filter((o) => o.status === "FILLED").length / orders.length) * 100) : 0}%`, tone: "text-slate-200" },
              { k: "avg slip", v: `${avgSlip.toFixed(2)}bps`, tone: "text-amber" },
              { k: "rejected (day)", v: String(rejected), tone: "text-short" },
              { k: "fees (day)", v: `$${fees.toFixed(2)}`, tone: "text-slate-300" },
            ].map((r) => (
              <div key={r.k} className="shrink-0 rounded-lg border border-edge bg-background/60 px-3 py-1.5">
                <div className="text-[9px] uppercase tracking-wider text-muted">{r.k}</div>
                <div className={`font-mono text-[12px] font-semibold tabular-nums ${r.tone}`}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OmsDeck tickers={tickers} now={now} orders={orders} fills={fills} onSend={onSend} onCancel={onCancel} onAmend={onAmend} />

      <div className="px-4 pb-4 text-[10px] font-mono text-slate-600">
        V8 · OMS as state machines — fills cross two-sided touch (bid/ask), BRK/OCO cancel siblings, ICE reveals child lots, rejects are first-class (RTH/BP/min-size), attribution → V6 model loop.
      </div>
    </ConsoleShell>
  );
}
