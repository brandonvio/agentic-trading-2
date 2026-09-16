// FX: majors, DXY, carry, overnight swaps, safe-haven bias.

import { SEED_PRICES } from "./instruments";

export const MAJORS = ["EUR/USD", "USD/JPY", "GBP/USD", "AUD/USD", "USD/CAD"] as const;
export type Pair = (typeof MAJORS)[number];

/** DXY basket (direct legs live; NORD/SF legs proxied) */
const BASKET: { leg: string; w: number; direct?: Pair }[] = [
  { leg: "EUR", w: 57.6, direct: "EUR/USD" },
  { leg: "JPY", w: 13.6, direct: "USD/JPY" },
  { leg: "GBP", w: 11.9, direct: "GBP/USD" },
  { leg: "SEK", w: 4.2 },
  { leg: "CHF", w: 3.6 },
  { leg: "DKK", w: 2.0 },
];
const PROXIES: Record<string, number> = { SEK: 10.03, CHF: 0.923, DKK: 7.455 };
const DXY_K = 50.14348112;

/** DXY from live pair quotes (inverse legs handled, 2006-08 reference) */
export function dxy(px: Record<string, number>): number {
  const REF: Record<string, number> = { EUR: 0.82, JPY: 121, GBP: 0.665, SEK: 8.3, CHF: 0.645, DKK: 6.17 };
  const legs: Record<string, number> = {
    EUR: 1 / (px["EUR/USD"] ?? 1.08),
    JPY: px["USD/JPY"] ?? 151,
    GBP: 1 / (px["GBP/USD"] ?? 1.27),
    SEK: PROXIES.SEK,
    CHF: PROXIES.CHF,
    DKK: PROXIES.DKK,
  };
  let out = DXY_K;
  for (const b of BASKET) out *= Math.pow(legs[b.leg] / REF[b.leg], b.w / 100);
  return Number(out.toFixed(1));
}

/** policy rates (%, static snapshot) */
const POLICY: Record<string, number> = { USD: 5.33, EUR: 3.15, JPY: 0.5, GBP: 4.75, AUD: 4.35, CAD: 3.25 };

/** USD carry (USD/XX): +bp = long USD, short local → earn */
export function carryBpUSD(pair: Pair): { carry: number; base: string } {
  const base = pair.split("/")[0];
  const other = pair.split("/")[1];
  const yBase = POLICY[base];
  const yOther = POLICY[other];
  const earnLongUsd = base === "USD" ? yBase - yOther : yOther - yBase;
  return { carry: Math.round(earnLongUsd * 100), base };
}

/** overnight swap cost per 100k, in $ (static venue model) */
export const SWAP_PER_100K: Record<Pair, number> = {
  "EUR/USD": 1.1,
  "USD/JPY": 2.4,
  "GBP/USD": 4.2,
  "AUD/USD": 6.1,
  "USD/CAD": 3.3,
};

/** safe-haven bias when regime flips risk-off (JPY & CHF = haven) */
export function havenBias(pair: Pair, riskOff: boolean): { dir: "+USD" | "-USD" | "neutral"; note: string } {
  const isHaven = pair === "USD/JPY" || pair === "USD/CAD";
  if (!riskOff) return { dir: "neutral", note: "risk-on drift" };
  if (isHaven) return { dir: "-USD", note: "haven flows push USD softer on these legs" };
  return { dir: "+USD", note: "dollar liquidity bid in stress" };
}

export const pairPx = (px: Record<string, number>, pair: Pair) =>
  px[pair] ?? SEED_PRICES[pair];
