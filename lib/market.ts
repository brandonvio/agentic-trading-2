// Mock market engine + domain types for the trading console.
// All data is generated client-side and mutated on a tick cadence to feel "alive".
// v2: a shared regime + one shock per tick drive every instrument; havens invert under risk-off.

import { meta, UNIVERSE, SEED_PRICES, type InstrumentType } from "./instruments";
import { printGap, type EventState } from "./macro";

export type Side = "long" | "short";

export interface Ticker {
  symbol: string;
  name: string;
  type: InstrumentType;
  price: number;
  prev: number;
  change: number; // session % change
  decimals: number;
  bid: number;
  ask: number;
  history: number[];
}

export interface Position {
  symbol: string;
  side: Side;
  qty: number;
  avg: number; // average entry
  strategy: string;
}

export interface Signal {
  id: string;
  symbol: string;
  side: Side;
  confidence: number; // 0-100
  strategy: string;
  reason: string;
  time: string;
  status: "executed" | "pending" | "rejected" | "skipped";
}

export interface LogLine {
  id: string;
  ts: string;
  level: "info" | "ok" | "warn" | "err" | "ai";
  text: string;
}

export interface BookLevel {
  px: number;
  qty: number;
}

export interface RiskState {
  exposure: number; // % of capital deployed
  maxDrawdown: number; // realized max DD %
  var95: number; // daily VaR ($)
  sharpe: number;
  sortino: number;
  maxPosition: number; // largest single position as % of book
  leverage: number;
}

// ---------- small helpers ----------
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
let _id = 0;
export const uid = () => `${Date.now().toString(36)}_${(_id++).toString(36)}`;
export const nowTime = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false });

// ---------- v1 seed (kept for compatibility) ----------
export const STRATEGIES = [
  "momentum-v4",
  "mean-revert-ml",
  "arb-cross-exch",
  "funding-capture",
  "vol-breakout",
  "orderflow-imb",
];

const REASONS: Record<Side, string[]> = {
  long: [
    "RSI(14) reversal + 2σ volume expansion",
    "Orderbook imbalance +3.1% bid pressure",
    "Momentum breakout through 20d high",
    "Funding turned negative → fade short squeeze",
    "ML net-flow score 0.82 exceeds 0.70 gate",
    "Bullish divergence on VWAP retest",
  ],
  short: [
    "RSI overbought + distribution tape read",
    "Ask wall 4.2% rejected on 3 prints",
    "Lower-high structure, momentum decay",
    "Funding +0.45% crowded long → fade",
    "ML net-flow score -0.77 below -0.60 gate",
    "Breakdown below VWAP support cluster",
  ],
};

export function makeHistory(base: number, vol: number, n = 42): number[] {
  const out: number[] = [];
  let p = base * (1 - vol * n * 0.3);
  for (let i = 0; i < n; i++) {
    p *= 1 + (Math.random() - 0.48) * vol * 4;
    out.push(p);
  }
  out[n - 1] = base;
  return out;
}

const quote = (price: number, decimals: number, bps: number) => ({
  bid: round(price * (1 - bps / 20000), decimals),
  ask: round(price * (1 + bps / 20000), decimals),
});

export function seedTickers(): Ticker[] {
  return UNIVERSE.map((m) => {
    const base = SEED_PRICES[m.symbol] ?? 100;
    const price = round(base, m.decimals);
    const change = round((Math.random() - 0.45) * 3, 2);
    const history = makeHistory(price, m.vol);
    const q = quote(price, m.decimals, m.spreadBps);
    return {
      symbol: m.symbol,
      name: m.name,
      type: m.type,
      price,
      prev: price,
      change,
      decimals: m.decimals,
      bid: q.bid,
      ask: q.ask,
      history,
    };
  });
}

export const SEED_POSITIONS: Position[] = [
  { symbol: "NVDA", side: "long", qty: 120, avg: 1142.5, strategy: "momentum-v4" },
  { symbol: "ETH-USD", side: "long", qty: 8.5, avg: 2980.0, strategy: "funding-capture" },
  { symbol: "AMD", side: "long", qty: 400, avg: 168.2, strategy: "vol-breakout" },
  { symbol: "TSLA", side: "short", qty: 250, avg: 251.9, strategy: "orderflow-imb" },
  { symbol: "BTC-USD", side: "short", qty: 0.6, avg: 67980.0, strategy: "mean-revert-ml" },
  { symbol: "COIN", side: "long", qty: 60, avg: 284.1, strategy: "arb-cross-exch" },
];

export function makeSignal(symbol: string): Signal {
  const side: Side = Math.random() > 0.45 ? "long" : "short";
  const r = Math.random();
  const status: Signal["status"] =
    r > 0.78 ? "executed" : r > 0.6 ? "pending" : r > 0.5 ? "skipped" : "rejected";
  return {
    id: uid(),
    symbol,
    side,
    confidence: Math.round(rand(58, 98)),
    strategy: pick(STRATEGIES),
    reason: pick(REASONS[side]),
    time: nowTime(),
    status,
  };
}

export function seedSignals(n = 7): Signal[] {
  const t = seedTickers();
  return Array.from({ length: n }, () =>
    makeSignal(pick(t).symbol)
  );
}

export function positionPnl(p: Position, mark: number): { pnl: number; pnlPct: number } {
  const dir = p.side === "long" ? 1 : -1;
  const pnl = (mark - p.avg) * p.qty * dir;
  const notional = p.avg * p.qty;
  return { pnl, pnlPct: notional ? (pnl / notional) * 100 : 0 };
}

// ---------- v2 core: regime + shared shock ----------
export type VolState = "calm" | "chop" | "riskoff";

export interface Regime {
  volState: VolState;
  trend: -1 | 0 | 1;
  driver: string;
  since: number; // ts of last switch
}

export interface MarketCore {
  regime: Regime;
  tickNo: number;
  lastEventId: string | null; // event that just printed (live→post) → armed one-shot gap
  armedGap: number; // consumed by the next shockOf, then reset
}

const VOL_MULT: Record<VolState, number> = { calm: 0.75, chop: 1.3, riskoff: 2.1 };
const DRIVERS: Record<VolState, string[]> = {
  calm: ["order-flow normalization", "earnings lull", "range-bound flow"],
  chop: ["rotation between sectors", "position de-grossing", "gamma two-way"],
  riskoff: ["FOMC hawkish tilt", "yield curve flip", "VIX spike 18 → 29"],
};

export const regimeLabel = (r: Regime) =>
  `${r.volState === "riskoff" ? "risk-off high-vol" : r.volState} · driver: ${r.driver}`;

const DRIVER = (state: VolState) => DRIVERS[state][Math.floor(Math.random() * 3)];

export function seedCore(now: number): MarketCore {
  const volState: VolState = pick(["calm", "calm", "chop", "chop", "riskoff"] as VolState[]);
  return {
    tickNo: 0,
    lastEventId: null,
    armedGap: 0,
    regime: {
      volState,
      trend: pick([-1, 0, 1] as const),
      driver: DRIVER(volState),
      since: now,
    },
  };
}

/** pure given inputs; switches regime when its window expires (45–90s);
 *  arms a one-shot complex gap when the calendar event just printed (live→post) */
export function tickCore(core: MarketCore, now: number, ev?: EventState): MarketCore {
  const window = 45000 + (core.tickNo % 3) * 15000;
  const expired = now - core.regime.since > window;
  const regime = expired
    ? {
        volState: pick(["calm", "calm", "chop", "chop", "riskoff"] as VolState[]),
        trend: pick([-1, 0, 1] as const),
        driver: DRIVER(pick(["calm", "chop", "riskoff"] as VolState[])),
        since: now,
      }
    : core.regime;
  const printed =
    ev?.phase === "post" && ev.event && core.lastEventId === ev.event.id ? ev.event : null;
  return {
    regime,
    tickNo: core.tickNo + 1,
    lastEventId: ev?.phase === "live" && ev.event ? ev.event.id : printed ? null : core.lastEventId,
    armedGap: printed ? printGap(printed) : 0,
  };
}

/** one shock per tick; sign + magnitude drive every instrument coherently */
export function shockOf(regime: Regime, mult = 1, gap = 0): number {
  const base = (Math.random() * 2 - 1) * 0.0007 * VOL_MULT[regime.volState] * mult;
  return base + regime.trend * 0.0004 * VOL_MULT[regime.volState] * mult + gap;
}

export const isRiskOff = (regime: Regime) => regime.volState === "riskoff";

/** 5x5 asset-class correlation matrix (deterministic, for the UI heat panel) */
export const CORR_LABELS = ["Equities", "Crypto", "Rates", "Gold", "FX"];
export const CORR: number[][] = [
  // Eq      Crypto  Rates   Gold     FX
  [1.0, 0.62, -0.41, 0.18, -0.22], // Equities
  [0.62, 1.0, -0.18, 0.24, -0.08], // Crypto
  [-0.41, -0.18, 1.0, 0.55, 0.31], // Rates
  [0.18, 0.24, 0.55, 1.0, 0.12], //  Gold
  [-0.22, -0.08, 0.31, 0.12, 1.0], // FX
];

// one market tick: every ticker moves with the shared shock (β-weighted)
// + havens invert under risk-off + idiosyncratic noise. Pure given (tickers, shock, riskOff).
export function tickPrices(
  tickers: Ticker[],
  opts: { shock?: number; riskOff?: boolean } = {}
): Ticker[] {
  const shock = opts.shock ?? (Math.random() * 2 - 1) * 0.0012;
  return tickers.map((t) => {
    const m = meta(t.symbol);
    const w = m.haven ? (opts.riskOff ? -m.haven : 0) : m.beta;
    const drift = shock * w + (Math.random() - 0.5) * m.vol * 2;
    const next = Math.max(0.0001, t.price * (1 + drift));
    const price = round(next, m.decimals);
    const q = quote(price, m.decimals, m.spreadBps);
    return {
      ...t,
      prev: t.price,
      price,
      bid: q.bid,
      ask: q.ask,
      change: round(t.change + drift * 100, 2),
      history: [...t.history.slice(1), price],
    };
  });
}

export const logPool: [LogLine["level"], string][] = [
  ["info", "engine: 6 strategies polling · 3 exchanges connected"],
  ["info", "risk: position sizing re-computed (vol-target 8%)"],
  ["ok", "risk: all limits within bounds · VaR(95) OK"],
  ["warn", "risk: NVDA exposure 24.1% > 20% soft cap → trimmed"],
  ["ai", "ai: confidence recalibrated on 5m window → drift +0.03"],
  ["info", "exec: order routed via 2 venues → 1.4ms ack"],
  ["ok", "arb: cross-exchange spread 3.1bp captured $412"],
  ["ai", "ai: regime=high-vol momentum · sizing scaled to 0.8x"],
];
