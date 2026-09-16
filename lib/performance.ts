// lib/performance.ts — account performance, deterministic.

export interface MonthRow {
  month: string; // "Jan"
  year: number;
  days: number[]; // 1-5 daily returns %
  total: number; // monthly total %
}

export interface AttributionSlice {
  name: string;
  pnl: number; // $
  pct: number; // % of total
}

export interface HistoryPoint {
  day: number; // 1..90
  selfUsd: number;
  benchUsd: number;
  selfPct: number;
  benchPct: number;
}

export interface RollingWindow {
  label: "1w" | "1m" | "3m" | "6m";
  sharpe: number;
  winRate: number;
  profitFactor: number;
  pnlPct: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
// seasonality: Q4 best (Oct-Dec), Jul weak
const SEASON = [-0.9, 0.4, 0.6, 1.4, 1.6, 1.8, 0.3, 0.2, 0.7, 0.5, 0.4, 0.1];

export function monthsMatrix(): MonthRow[] {
  const rand = rng(0xC0FFEE);
  return MONTHS.map((month, i) => {
    const nDays = 18 + Math.floor(rand() * 6); // 18-23 active days
    const days: number[] = [];
    for (let d = 0; d < nDays; d++) {
      const noise = (rand() - 0.5) * 1.6;
      const drift = SEASON[i] / nDays;
      days.push(+(drift + noise).toFixed(3));
    }
    const total = +(days.reduce((a, b) => a + b, 0)).toFixed(2);
    return {
      month,
      year: i < 6 ? 2025 : 2026,
      days,
      total,
    };
  });
}

export interface Attribution {
  byStrategy: AttributionSlice[];
  bySymbol: AttributionSlice[];
  byFactor: AttributionSlice[];
  totalPnl: number;
}

export function attribution(): Attribution {
  const raw = {
    byStrategy: [
      ["Momentum v4", 168_000],
      ["Cross-Venue Arb", 142_000],
      ["Funding Capture", 96_000],
      ["Vol Arb v2", 54_000],
      ["Orderflow Imbalance", -38_000],
    ] as [string, number][],
    bySymbol: [
      ["BTC-USD", 212_000],
      ["ETH-USD", 131_000],
      ["SOL-USD", 84_000],
      ["NVDA", 46_000],
      ["TSLA", 18_000],
      ["COIN", -27_000],
    ] as [string, number][],
    byFactor: [
      ["Carry", 188_000],
      ["Momentum", 152_000],
      ["Volatility timing", 61_000],
      ["Liquidity provision", -14_000],
    ] as [string, number][],
  };
  const totalPnl = raw.byStrategy.reduce((a, [, v]) => a + v, 0);
  const slice = (rows: [string, number][]): AttributionSlice[] =>
    rows
      .map(([name, pnl]) => ({ name, pnl, pct: (pnl / totalPnl) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);
  return { byStrategy: slice(raw.byStrategy), bySymbol: slice(raw.bySymbol), byFactor: slice(raw.byFactor), totalPnl };
}

export function history(): HistoryPoint[] {
  const rand = rng(0xBEEF);
  const out: HistoryPoint[] = [];
  let self = 1_000_000;
  let bench = 1_000_000;
  for (let d = 1; d <= 90; d++) {
    const noiseS = (rand() - 0.5) * 2.4; // daily noise %
    const rSelf = 0.18 + noiseS * 0.8; // avg edge +0.18%/day
    const rBench = noiseS * 0.5 - 0.04;
    self *= 1 + rSelf / 100;
    bench *= 1 + rBench / 100;
    out.push({
      day: d,
      selfUsd: Math.round(self),
      benchUsd: Math.round(bench),
      selfPct: +(((self / 1_000_000 - 1) * 100)).toFixed(2),
      benchPct: +(((bench / 1_000_000 - 1) * 100)).toFixed(2),
    });
  }
  return out;
}

export function rolling(): RollingWindow[] {
  // derived from a seeded walk consistent with ~+60bps/day
  const base = [
    { label: "1w" as const, sharpe: 2.9, winRate: 68, profitFactor: 2.4, pnlPct: 1.4 },
    { label: "1m" as const, sharpe: 2.4, winRate: 63, profitFactor: 2.0, pnlPct: 5.8 },
    { label: "3m" as const, sharpe: 2.1, winRate: 61, profitFactor: 1.8, pnlPct: 17.2 },
    { label: "6m" as const, sharpe: 1.8, winRate: 58, profitFactor: 1.6, pnlPct: 33.9 },
  ];
  return base;
}

export function headline(months: MonthRow[], hist: HistoryPoint[]) {
  const totalPct = months.reduce((a, m) => a + m.total, 0);
  const best = months.reduce((a, m) => (m.total > a.total ? m : a), months[0]);
  const last = hist[hist.length - 1];
  const alpha = last.selfPct - last.benchPct;
  return {
    cumulative: +(1_000_000 * totalPct / 100).toFixed(0),
    ytd: +(months.filter((m) => m.year === 2026).reduce((a, m) => a + m.total, 0)).toFixed(2),
    best,
    last30Alpha: +alpha.toFixed(2),
  };
}
