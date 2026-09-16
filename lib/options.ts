// Options & volatility — Black-Scholes with a deterministic IV surface
// (skew × term structure), chains off the live spot, max pain, gamma exposure,
// and P&L-at-expiry for four strategy templates. Pure functions of (spot, dte).

import { round } from "./market";

const R = 0.041; // flat risk-free

/* ---------- math ---------- */
const SQRT2PI = Math.sqrt(2 * Math.PI);
const phi = (x: number) => Math.exp((-x * x) / 2) / SQRT2PI;
const N = (x: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const p =
    phi(x) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
};

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  charm: number;
  ce: number;
}

/** Black-Scholes price + greeks. iv in percent, T in years. */
export function bs(S: number, K: number, dte: number, ivPct: number, type: "C" | "P"): Greeks {
  const iv = Math.max(ivPct, 1) / 100;
  const T = Math.max(dte, 1) / 365;
  const sqT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (R + (iv * iv) / 2) * T) / (iv * sqT);
  const d2 = d1 - iv * sqT;
  const df = Math.exp(-R * T);
  const call = S * N(d1) - K * df * N(d2);
  const put = K * df * N(-d2) - S * N(-d1);
  const gamma = phi(d1) / (S * iv * sqT);
  const vega = (S * phi(d1) * sqT) / 100;
  const delta = type === "C" ? N(d1) : N(d1) - 1;
  const theta =
    type === "C"
      ? (-S * phi(d1) * iv) / (2 * sqT) - (R * K * df * N(d2)) / 365
      : (-S * phi(d1) * iv) / (2 * sqT) + (R * K * df * N(-d2)) / 365;
  const charm = ((type === "C" ? -1 : 1) * phi(d1) * d2) / (K * iv * sqT);
  return {
    price: type === "C" ? call : put,
    delta,
    gamma,
    vega,
    theta,
    charm,
    ce: charm / R,
  };
}

/* ---------- IV surface: base level × skew × term structure ---------- */
const BASE_IV: Record<string, number> = {
  NVDA: 42, TSLA: 58, AAPL: 22, MSFT: 20,
  "BTC-USD": 48, "ETH-USD": 55, "SOL-USD": 62, "LINK-USD": 65, "AVAX-USD": 68,
  ES: 15, NQ: 24, CL: 32, GC: 16, ZB: 6.5, ZL: 9,
  GLD: 15, TLT: 25, EEM: 24, EZU: 21, "EUR/USD": 8, "USD/JPY": 9, "USD/CHF": 7,
};

export const baseIV = (symbol: string) => BASE_IV[symbol] ?? 30;

/** IV in % for (symbol, dte, moneyness m = K/S). Put-skewed smile, short-dated vol premium. */
export function ivOf(symbol: string, dte: number, m: number): number {
  const base = baseIV(symbol);
  const smile = 1 + 0.85 * (m - 0.5) ** 2;
  const skew = m < 0.55 ? 1 + 0.55 * (0.55 - m) : 1 + 0.2 * (m - 0.55);
  const term = dte <= 45 ? 1.09 : dte <= 90 ? 1.0 : dte <= 180 ? 0.94 : 0.88;
  return round(base * smile * skew * term, 2);
}

/* ---------- chains ---------- */
export interface ChainRow {
  type: "C" | "P";
  strike: number;
  bid: number;
  ask: number;
  iv: number;
  openInterest: number;
  volume: number;
  g: Greeks;
}

export const niceStep = (spot: number): number => {
  const target = Math.max(spot * 0.012, 0.05);
  const ladder = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000];
  for (const s of ladder) if (s >= target) return s;
  return 5000;
};

const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

const DETERM = (s: string, salt: number) => ((hash(s + ":k" + salt) % 997) / 997);

/** chain of 7 calls + 7 puts around ATM for a given dte */
export function chainFor(symbol: string, spot: number, dte: number): ChainRow[] {
  const step = niceStep(spot);
  const atm = Math.round(spot / step) * step;
  const strikes: number[] = [];
  for (let i = 7; i >= 0; i--) strikes.push(atm - i * step);
  for (let i = 1; i <= 7; i++) strikes.push(atm + i * step);
  const baseOI = baseIV(symbol) > 35 ? 90e3 : 420e3;
  const rows: ChainRow[] = [];
  for (const K of strikes) {
    for (const type of ["C", "P"] as const) {
      const m = K / Math.max(spot, 1e-8);
      const iv = ivOf(symbol, dte, m);
      const g = bs(spot, K, dte, iv, type);
      const spread = g.price * 0.035 + 0.05;
      rows.push({
        type,
        strike: K,
        bid: round(Math.max(g.price - spread / 2, 0.01), 2),
        ask: round(Math.max(g.price + spread / 2, 0.02), 2),
        iv,
        openInterest: Math.round(baseOI * (0.35 + DETERM(symbol, K) * 1.5) * Math.max(0.2, 1.4 - Math.abs(m - 1) * 2)),
        volume: Math.round(baseOI * 0.12 * (0.4 + DETERM("vol" + symbol, K) * 2)),
        g,
      });
    }
  }
  return rows;
}

/* ---------- implied vol surface for plotting ---------- */
export function ivCurve(symbol: string, dte: number, moneynesses: number[]): number[] {
  return moneynesses.map((m) => ivOf(symbol, dte, m));
}

/* ---------- max pain ---------- */
export function maxPain(rows: ChainRow[]): { strike: number; pain: number } {
  const calls = rows.filter((r) => r.type === "C");
  const puts = rows.filter((r) => r.type === "P");
  let best = { strike: calls[0]?.strike ?? 0, pain: Infinity };
  for (const K of new Set([...calls, ...puts].map((r) => r.strike))) {
    const callPain = calls.reduce((a, c) => a + c.openInterest * Math.max(0, K - c.strike), 0);
    const putPain = puts.reduce((a, p) => a + p.openInterest * Math.max(0, p.strike - K), 0);
    const pain = callPain + putPain;
    if (pain < best.pain) best = { strike: K, pain };
  }
  return best;
}

/* ---------- gamma / gex ---------- */
export function gammaOf(rows: ChainRow[], spot: number) {
  const perStrike = [
    ...new Set(rows.map((r) => r.strike)),
  ].map((K) => {
    const c = rows.find((r) => r.strike === K && r.type === "C");
    const p = rows.find((r) => r.strike === K && r.type === "P");
    const gamma = ((c?.openInterest ?? 0) * (c?.g.gamma ?? 0) + (p?.openInterest ?? 0) * (p?.g.gamma ?? 0)) * spot;
    return { K, gamma, gex: ((c?.openInterest ?? 0) * (c?.g.gamma ?? 0) - (p?.openInterest ?? 0) * (p?.g.gamma ?? 0)) * spot };
  });
  perStrike.sort((a, b) => a.K - b.K);
  const net = perStrike.reduce((a, s) => a + s.gamma, 0);
  let flip = spot;
  let acc = 0;
  for (const s of perStrike) {
    acc += s.gex;
    if (acc >= 0) { flip = s.K; break; }
  }
  return { perStrike, net, flip };
}

/* ---------- strategy templates → P&L at expiry ---------- */
export interface StrategyPlan {
  id: "vertical" | "straddle" | "ironCondor" | "calendar";
  name: string;
  legs: { type: "C" | "P"; strike: number; qty: number }[];
  premium: number; // net credit − (debit +)
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  notes: string;
}

function payoffAtExpiry(legs: StrategyPlan["legs"], S: number): number {
  return legs.reduce(
    (a, l) => a + l.qty * (l.type === "C" ? Math.max(S - l.strike, 0) : Math.max(l.strike - S, 0)),
    0
  );
}

export const ATM_STRIKE = (spot: number) => Math.round(spot / niceStep(spot)) * niceStep(spot);

/** build a plan around the near ATM strike (100-share units) */
export function buildStrategy(id: StrategyPlan["id"], symbol: string, spot: number, dte: number): StrategyPlan {
  const K = ATM_STRIKE(spot);
  const step = niceStep(spot) * 2;
  const prem = (legs: StrategyPlan["legs"]) =>
    legs.reduce((a, l) => {
      const iv = ivOf(symbol, dte, l.strike / spot);
      const px = bs(spot, l.strike, dte, iv, l.type).price;
      return a + l.qty * px;
    }, 0);

  if (id === "vertical") {
    const longC = { type: "C" as const, strike: K, qty: 1 };
    const shortC = { type: "C" as const, strike: K + step, qty: -1 };
    const legs = [longC, shortC];
    const debit = prem(legs);
    return {
      id, name: "Debit call vertical", legs, premium: -debit,
      maxProfit: step - debit, maxLoss: debit, breakevens: [K + debit],
      notes: `long ${K} / short ${K + step} · capped both directions`,
    };
  }
  if (id === "straddle") {
    const legs = [
      { type: "C" as const, strike: K, qty: 1 },
      { type: "P" as const, strike: K, qty: 1 },
    ];
    const debit = prem(legs);
    return {
      id, name: `Long straddle @ ${K}`, legs, premium: -debit,
      maxProfit: Infinity, maxLoss: debit, breakevens: [K - debit, K + debit],
      notes: "long vol & move — loses to theta inside the wings",
    };
  }
  if (id === "ironCondor") {
    const legs = [
      { type: "P" as const, strike: K - step, qty: 1 },
      { type: "P" as const, strike: K, qty: -1 },
      { type: "C" as const, strike: K + step, qty: -1 },
      { type: "C" as const, strike: K + step * 2, qty: 1 },
    ];
    const credit = prem(legs); // negative = credit
    const c = -credit;
    return {
      id, name: "Iron condor (neutral)", legs, premium: c,
      maxProfit: c, maxLoss: Math.max(step - c, 0.01), breakevens: [K - step + c, K + step - c],
      notes: `short ${K} put / ${K + step} call · wings ${K - step} / ${K + step * 2} protect the shorts`,
    };
  }
  // calendar: long-dated 90d, short 15d ATM
  const nearT = Math.max(dte, 7);
  const farT = Math.max(nearT + 60, 90);
  const near = bs(spot, K, nearT, ivOf(symbol, nearT, 1), "C").price;
  const far = bs(spot, K, farT, ivOf(symbol, farT, 1), "C").price;
  const credit = far - near;
  return {
    id, name: "Calendar (long far ATM)",
    legs: [
      { type: "C", strike: K, qty: 1 },
      { type: "C", strike: K, qty: -1 },
    ],
    premium: credit,
    maxProfit: credit,
    maxLoss: credit * 1.6,
    breakevens: [K * (1 - credit / Math.max(near, 1)), K * (1 + credit / Math.max(near, 1))],
    notes: `short ${nearT}d / long ${farT}d @ ${K} · long vega, short delta at ATM`,
  };
}

/** P&L curve: uniform `payoff + netPremium` rule; calendar valued as spread-vs-entry. */
export function pnlCurve(plan: StrategyPlan, symbol: string, spot: number, dte: number, n = 41): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const S = spot * (0.92 + (1.04 * i) / (n - 1));
    if (plan.id === "calendar") {
      const nearT = Math.max(dte, 7);
      const farT = Math.max(nearT + 60, 90);
      const K = plan.legs[0].strike;
      const spreadAt = (X: number) =>
        bs(X, K, farT, ivOf(symbol, farT, 1), "C").price - bs(X, K, nearT, ivOf(symbol, nearT, 1), "C").price;
      const entry = spreadAt(spot);
      out.push(spreadAt(S) - entry);
    } else {
      out.push(payoffAtExpiry(plan.legs, S) + plan.premium);
    }
  }
  return out;
}
