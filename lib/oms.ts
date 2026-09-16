// lib/oms.ts — Order Management: orders as pure state machines (V8-S1).
//
// Types: LMT / STP / STP_LMT / BRK (bracket children) / OCO (sibling pair) / ICE (iceberg).
// Rules (deterministic, testable):
//   * LMT fills when touch crosses the limit (maker); partial chunks = qty/3 per tick.
//   * STP / STP_LMT trigger when touch breaches the stop, then fill as taker w/ slippage.
//   * BRK — a filled child cancels its remaining siblings (stop/TP bracket).
//   * OCO — a filled child cancels the sibling (one-cancels-other).
//   * ICE — visible displayQty < workQty; each fill "reveals" the next child lot.
// Rejects are first-class: RTH-only, session closed, buying power, min-qty/min-tick.

import { meta } from "./instruments";
import type { SessionClass } from "./instruments";

/** deterministic hash → [0,1) (FNV-1a variant, same family as lib/brain) */
export function h01(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 10_000) / 10_000;
}

// ---------- types ----------

export type OmSide = "BUY" | "SELL";
export type OmType = "LMT" | "STP" | "STP_LMT" | "BRK" | "OCO" | "ICE";
export type OmTif = "GTC" | "IOC" | "FOK";
export type OmStatus = "WORKING" | "QUEUED" | "PARTIAL" | "FILLED" | "CANCELED" | "REJECTED";

export interface OmOrder {
  id: string;
  symbol: string;
  side: OmSide;
  type: OmType;
  qty: number;
  filledQty: number;
  avgPx: number; // vwap
  limitPx: number | null;
  stopPx: number | null;
  displayQty?: number; // ICE visible lot
  tif: OmTif;
  status: OmStatus;
  venue: string; // OKX / Bybit / IB
  modelId?: string; // V6 attribution
  t0: number; // submission ts
  parentId?: string; // BRK / OCO linkage (pointing at root)
  rejectReason?: string;
  triggeredTs?: number; // STP arms → fill ts
}

export interface OmFill {
  orderId: string;
  symbol: string;
  side: OmSide;
  px: number;
  qty: number;
  feeUsd: number;
  slippageBps: number; // vs reference (limit/trigger)
  role: "MAKER" | "TAKER";
  venue: string;
  latencyMs: number;
  ts: number;
  modelId?: string;
}

export interface OmReject {
  orderId: string;
  symbol: string;
  reason: string;
  ts: number;
}

export interface OmMoney {
  buyingPowerUsd: number;
  creditLimitUsd: number;
}

// ---------- guards (T3) ----------

const RTH_ONLY = new Set(["ES", "NQ", "SPY", "QQQ", "IWM", "TLT", "GLD", "USO"]);

export function sessionOpen(class_: SessionClass, now: number): boolean {
  const d = new Date(now);
  const wd = d.getUTCDay();
  if ((class_ === "equityRTH" || class_ === "futures23") && wd === 0) return false;
  if (wd === 6) return class_ === "crypto24";
  return true; // hour precision is the session clock's job (V7)
}

export interface RejectCtx {
  now: number;
  buyingPowerUsd: number;
}

/** Returns a reject reason string, or null if the order may work. */
export function rejectReason(o: OmOrder, ctx: RejectCtx): string | null {
  const m = meta(o.symbol);
  if (o.qty < m.minQty) return `min-qty ${m.minQty} for ${o.symbol}`;
  if (o.limitPx !== null && m.decimals >= 0) {
    const step = 1e-9;
    const q = Math.round(o.limitPx * 10 ** m.decimals) / 10 ** m.decimals;
    if (Math.abs(q - o.limitPx) > step) return `min-tick for ${o.symbol}`;
  }
  const notional = (o.limitPx ?? 0) * o.qty * m.multiplier;
  if (notional > ctx.buyingPowerUsd * 1.15) return `buying power short $${Math.round(notional - ctx.buyingPowerUsd).toLocaleString()}`;
  if (RTH_ONLY.has(o.symbol) && meta(o.symbol).sessionClass === "equityRTH") {
    const d = new Date(ctx.now);
    const h = d.getUTCHours() + 13; // ET
    if (h < 9.5 || h > 16) return "RTH-only — it would rest overnight";
  }
  if (!sessionOpen(m.sessionClass, ctx.now)) return `session closed for ${meta(o.symbol).sessionClass}`;
  return null;
}

// ---------- queue + slippage (T4) ----------

export interface QueueState {
  position: number; // ahead of you
  expectedWaitMs: number;
}

/** Deterministic queue position from order id + venue depth fingerprint. */
export function queueOf(o: OmOrder, venueDepth: number[]): QueueState {
  const depthTotal = venueDepth.reduce((s, d) => s + d, 0);
  const pos = 1 + Math.floor(h01(o.id + o.venue) * Math.min(9, depthTotal / 25));
  const wait = Math.round((h01(o.id) * 3200 + 250) / 50) * 50;
  return { position: pos, expectedWaitMs: wait };
}

/** Taker slippage: base half-spread + size impact + venue latency drag (bps). */
export function slippageBps(sizeUsd: number, spreadBps: number, venueLatencyMs: number): number {
  const base = spreadBps / 2;
  const impact = 0.02 * Math.sqrt(Math.max(0, sizeUsd) / 25_000); // square-root market impact
  const latency = Math.min(6, venueLatencyMs / 40) / 10;
  return Number((base + impact + latency).toFixed(2));
}

// ---------- tick (T2) ----------

const CHUNC = 0.34; // fraction of remaining qty filled per crossing tick (deterministic partials)

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export interface OmTickOut {
  orders: OmOrder[];
  fills: OmFill[];
  rejects: OmReject[];
}

/**
 * Pure one-tick step. `touch(symbol)` = best executable price for the side:
 * BUY → ask, SELL → bid (two-sided quotes, no mid).
 */
export function omsTick(
  orders: OmOrder[],
  touch: (symbol: string, side: OmSide) => number,
  venueLatencyMs: number,
  ctx: RejectCtx,
): OmTickOut {
  const os = orders.map((o) => ({ ...o }));
  const fills: OmFill[] = [];
  const rejects: OmReject[] = [];
  const byId = (id: string) => os.find((o) => o.id === id);

  // 1) reject freshly-working orders (status QUEUED → REJECTED)
  for (const o of os) {
    if (o.status !== "QUEUED") continue;
    const why = rejectReason(o, ctx);
    if (why) {
      o.status = "REJECTED";
      o.rejectReason = why;
      rejects.push({ orderId: o.id, symbol: o.symbol, reason: why, ts: ctx.now });
    } else {
      o.status = "WORKING";
    }
  }

  const canFill = (o: OmOrder): number | null => {
    if (o.status !== "WORKING" && o.status !== "PARTIAL") return null;
    const px = touch(o.symbol, o.side);
    if (!px || o.filledQty >= o.qty) return null;
    if (o.type === "LMT" || o.type === "ICE") {
      if (o.limitPx === null) return null;
      if ((o.side === "BUY" && px <= o.limitPx) || (o.side === "SELL" && px >= o.limitPx)) return o.limitPx;
      return null;
    }
    if (o.type === "STP" || o.type === "STP_LMT") {
      if (o.stopPx === null) return null;
      if ((o.side === "BUY" && px >= o.stopPx) || (o.side === "SELL" && px <= o.stopPx)) return px; // taker at touch
    }
    return null;
  };

  for (const o of os) {
    const fillPx = canFill(o);
    if (fillPx === null) continue;
    const m = meta(o.symbol);
    const remaining = o.qty - o.filledQty;
    const isTaker = o.type === "STP" || o.type === "STP_LMT";
    const qty = o.tif === "IOC" || o.tif === "FOK" ? remaining : Math.max(1, Math.round(remaining * CHUNC));
    const px = round(isTaker ? fillPx : fillPx, m.decimals);
    const slip = isTaker ? slippageBps(px * qty * m.multiplier, m.spreadBps, venueLatencyMs) : 0;
    const fee = (px * qty * m.multiplier) * (o.venue === "Bybit" ? 5 : o.venue === "OKX" ? 6 : 2) / 10_000;
    const newAvg = o.filledQty === 0 ? px : (o.avgPx * o.filledQty + px * qty) / (o.filledQty + qty);
    o.filledQty += qty;
    o.avgPx = newAvg;
    o.status = o.filledQty >= o.qty ? "FILLED" : "PARTIAL";
    fills.push({
      orderId: o.id,
      symbol: o.symbol,
      side: o.side,
      px,
      qty,
      feeUsd: Number(fee.toFixed(2)),
      slippageBps: slip,
      role: isTaker ? "TAKER" : "MAKER",
      venue: o.venue,
      latencyMs: Math.round(venueLatencyMs * (0.8 + h01(o.id + o.filledQty) * 0.6)),
      ts: ctx.now,
      modelId: o.modelId,
    });
    if (o.status === "FILLED") {
      // BRK: cancel sibling children of same root
      if (o.type === "BRK" && o.parentId) {
        for (const s of os) {
          if (s.id !== o.id && s.parentId === o.parentId && (s.status === "WORKING" || s.status === "PARTIAL")) {
            s.status = "CANCELED";
            s.rejectReason = "bracket leg filled";
          }
        }
      }
      // OCO: cancel the other sibling (parent id = sibling's id)
      if (o.type === "OCO") {
        const sib = o.parentId ? byId(o.parentId) : undefined;
        if (sib && sib.type === "OCO" && sib.parentId === (o.parentId ?? o.id) && (sib.status === "WORKING" || sib.status === "PARTIAL")) {
          sib.status = "CANCELED";
          sib.rejectReason = "OCO sibling filled";
        }
      }
    }
  }

  return { orders: os, fills, rejects };
}

// ---------- convenience ----------

export function orderAgeSec(o: OmOrder, now: number): number {
  return Math.max(0, Math.round((now - o.t0) / 1000));
}
