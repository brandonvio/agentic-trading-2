// AI Brain: signals as computation. Every output = pure function of features.
// Features come from live tick data; weights are fixed per model version.
// Attribution is exact: contributions sum to the (pre-clip) score within fp error.

import { meta } from "./instruments";

export type FeatKey =
  | "momZ"
  | "trendStrength"
  | "bookImb"
  | "funding"
  | "ivSlope"
  | "regimeBeta"
  | "spreadBps"
  | "corrToEs"
  | "volNorm";

export interface Features {
  momZ: number;
  trendStrength: number;
  bookImb: number;
  funding: number;
  ivSlope: number;
  regimeBeta: number;
  spreadBps: number;
  corrToEs: number;
  volNorm: number;
}

const clip = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

/** deterministic non-crypto hash → [0,1) */
function h01(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 10_000) / 10_000;
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

/**
 * Features from instrument + its tick series + market context.
 * momZ: z-like momentum of the last window vs the prior window (clamped)
 * trendStrength: |slope| normalized
 * bookImb: deterministic venue-book skew (proxy for orderflow)
 * funding: crypto only — deterministic level around 0.01..0.03%
 * ivSlope: deterministic IV term slope
 * regimeBeta: signed beta/haven response in current regime
 * spreadBps: cost drag (meta)
 * corrToEs: correlation-like linkage to the equity shock
 * volNorm: relative vol
 */
export function featuresFor(symbol: string, history: number[], riskOff: boolean): Features {
  const m = meta(symbol);
  const px = history.length ? history : [100];
  const n = px.length;
  const win = Math.min(12, Math.max(2, Math.floor(n / 3)));
  const recent = px.slice(-win);
  const prior = px.slice(-2 * win, -win).length ? px.slice(-2 * win, -win) : px.slice(0, Math.max(1, win));
  const rRecent = mean(recent);
  const rPrior = rPriorSafe(prior);
  const move = rPrior ? (rRecent - rPrior) / rPrior : 0;
  const rets: number[] = [];
  for (let i = Math.max(1, n - win * 2); i < n; i++) if (px[i - 1]) rets.push((px[i] - px[i - 1]) / px[i - 1]);
  const sd = Math.sqrt(rets.reduce((s, r) => s + r * r, 0) / Math.max(1, rets.length)) || 1;
  const momZ = clip(move / (sd * Math.sqrt(Math.max(1, win))) );
  const slope = n > 1 && px[0] ? (px[n - 1] - px[0]) / px[0] : 0;
  const trendStrength = clip(slope * 40);
  const bookImb = (h01(`book:${symbol}`) * 2 - 1) * 0.6;
  const funding = m.type === "crypto" ? (0.01 + h01(`fund:${symbol}`) * 0.02) / 100 * 100 / 100 : 0;
  const ivSlope = (h01(`iv:${symbol}`) * 2 - 1) * 0.35 + (riskOff ? 0.18 : 0);
  const regimeBeta = riskOff ? (m.haven > 0 ? -0.6 - m.haven * 0.4 : m.beta) : m.beta * 0.8;
  const spreadBps = clip(m.spreadBps / 8);
  const corrToEs = clip(m.beta * 0.7 - (riskOff ? m.haven * 0.5 : 0));
  const volNorm = clip(m.vol * 260);
  return {
    momZ: Number(momZ.toFixed(4)),
    trendStrength: Number(trendStrength.toFixed(4)),
    bookImb: Number(bookImb.toFixed(4)),
    funding: Number(funding.toFixed(4)),
    ivSlope: Number(ivSlope.toFixed(4)),
    regimeBeta: Number(regimeBeta.toFixed(4)),
    spreadBps: Number(spreadBps.toFixed(4)),
    corrToEs: Number(corrToEs.toFixed(4)),
    volNorm: Number(volNorm.toFixed(4)),
  };
}

function rPriorSafe(prior: number[]): number {
  return mean(prior);
}

/** Model: named, versioned weight vector over features. Score ∈ [-1,1]. */
export interface Model {
  id: string;
  name: string;
  version: string;
  universe: string; // human label
  typeFilter?: string; // InstrumentType, undefined = all
  weights: Partial<Record<FeatKey, number>>;
  note: string;
}

export const MODELS: Model[] = [
  {
    id: "mom-4.2",
    name: "Momentum",
    version: "v4.2",
    universe: "equity · etf · intl",
    typeFilter: undefined,
    weights: { momZ: 0.55, trendStrength: 0.25, corrToEs: 0.2 },
    note: "trend continuation when cross-asset linkage confirms",
  },
  {
    id: "flow-imb",
    name: "Orderflow Imb",
    version: "v2.7",
    universe: "equity · etf · crypto",
    weights: { bookImb: 0.6, momZ: 0.2, volNorm: 0.2 },
    note: "book skew + follow-through momentum",
  },
  {
    id: "fund-capt",
    name: "Funding Capture",
    version: "v3.1",
    universe: "crypto",
    typeFilter: "crypto",
    weights: { funding: 0.7, momZ: 0.3 },
    note: "long crowded-positive funding, trim on extremes",
  },
  {
    id: "mr-ml",
    name: "Mean Revert (ML)",
    version: "v1.9",
    universe: "etf · equity · treasury",
    weights: { momZ: -0.55, spreadBps: -0.15, volNorm: 0.2 },
    note: "fades stretched moves when vol regime is calm",
  },
  {
    id: "volarb-2",
    name: "Vol Arb",
    version: "v2.0",
    universe: "equity · fx · future",
    weights: { ivSlope: 0.5, volNorm: -0.3, regimeBeta: -0.2 },
    note: "fades convexity premia in stressed term structures",
  },
  {
    id: "xvenue-arb",
    name: "Cross-Venue Arb",
    version: "v1.4",
    universe: "crypto",
    typeFilter: "crypto",
    weights: { bookImb: 0.5, spreadBps: -0.3, momZ: 0.2 },
    note: "spreads across OKX / Bybit / Bitget dislocations",
  },
];

export function modelsFor(symbol: string): Model[] {
  const t = meta(symbol).type;
  return MODELS.filter((m) => !m.typeFilter || m.typeFilter === t);
}

export interface Attribution {
  feature: FeatKey;
  contribution: number;
}

export interface Decision {
  modelId: string;
  model: string;
  version: string;
  symbol: string;
  score: number; // raw (pre-clip) sum of contributions
  clipped: number; // clipped to [-1,1]
  side: "LONG" | "SHORT" | "FLAT";
  confidence: number; // 0-100
  attributions: Attribution[]; // sorted |contribution| desc, sum ≈ score
  reason: string;
}

/** decision = f(model, features) — identical inputs, identical outputs. */
export function decision(model: Model, symbol: string, f: Features): Decision {
  const attribs: Attribution[] = [];
  for (const [k, w] of Object.entries(model.weights) as [FeatKey, number][]) {
    attribs.push({ feature: k, contribution: clip(Number((w * f[k]).toFixed(6))) });
  }
  const raw = attribs.reduce((s, a) => s + a.contribution, 0);
  const clippedN = clip(raw);
  const side: Decision["side"] = clippedN > 0.08 ? "LONG" : clippedN < -0.08 ? "SHORT" : "FLAT";
  const confidence = Math.round(Math.min(95, 35 + Math.abs(clippedN) * 55));
  const sorted = [...attribs].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const top = sorted.slice(0, 2);
  const dirWord = side === "LONG" ? "long" : side === "SHORT" ? "short" : "flat";
  const featWord = (k: FeatKey) =>
    ({
      momZ: "momentum",
      trendStrength: "trend strength",
      bookImb: "book imbalance",
      funding: "funding level",
      ivSlope: "IV slope",
      regimeBeta: "regime beta",
      spreadBps: "spread cost",
      corrToEs: "ES correlation",
      volNorm: "vol regime",
    })[k];
  const reason =
    side === "FLAT"
      ? `${model.name} ${model.version} on ${symbol}: net edge ${clippedN.toFixed(2)} is inside the no-trade band — ${featWord(top[0].feature)} ${top[0].contribution >= 0 ? "+" : ""}${top[0].contribution.toFixed(2)} is offset elsewhere in the vector.`
      : `${model.name} ${model.version} on ${symbol}: ${dirWord} at ${clippedN.toFixed(2)} — ${featWord(top[0].feature)} ${top[0].contribution >= 0 ? "+" : ""}${top[0].contribution.toFixed(2)} leads, ${featWord(top[1].feature)} ${top[1].contribution >= 0 ? "+" : ""}${top[1].contribution.toFixed(2)} ${top[1].contribution * clippedN >= 0 ? "confirms" : "partly offsets"}.`;
  return {
    modelId: model.id,
    model: model.name,
    version: model.version,
    symbol,
    score: Number(raw.toFixed(6)),
    clipped: Number(clippedN.toFixed(6)),
    side,
    confidence,
    attributions: sorted,
    reason,
  };
}

/** ranking of all eligible models for a symbol, best first (by |score| among non-flat, then |score|) */
export function rankModels(symbol: string, f: Features): Decision[] {
  return modelsFor(symbol)
    .map((m) => decision(m, symbol, f))
    .sort((a, b) => {
      const aw = a.side === "FLAT" ? 0 : 1;
      const bw = b.side === "FLAT" ? 0 : 1;
      return bw - aw || Math.abs(b.clipped) - Math.abs(a.clipped);
    });
}
