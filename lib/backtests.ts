// lib/backtests.ts — historical strategy evaluations, pure.

import { pick, round, uid } from "./market";

export interface RunParams {
  lookback: number;
  threshold: number;
  maxPos: number;
  riskPct: number;
}

export interface RunMetrics {
  netPnl: number;
  sharpe: number;
  sortino: number;
  maxDD: number; // positive % number
  winRate: number; // 0-100
  profitFactor: number;
  trades: number;
  cagr: number;
}

export interface BacktestRun {
  id: string;
  label: string;
  strategy: string;
  symbol: string;
  timeframe: "1m" | "5m" | "1h" | "1d";
  rangeText: string;
  params: RunParams;
  metrics: RunMetrics;
  equityCurve: number[]; // 64 points, starts at 100
  drawdown: number[]; // 64 points, <= 0
}

const STRATEGY = ["Momentum v4", "Funding Capture", "Cross-Venue Arb", "Vol Arb v2", "Orderflow Imbalance", "Mean-Revert 3s"];
const SYMBOL = ["BTC-USD", "ETH-USD", "SOL-USD", "NVDA", "TSLA", "AMD", "COIN"];
const TF: BacktestRun["timeframe"][] = ["1m", "5m", "1h", "1d"];
const RANGE = ["30d", "90d", "180d", "2Y"];
const LABEL = [
  "Baseline",
  "Tight stops",
  "Wider threshold",
  "MaxPos=3",
  "Risk 6%",
  "Fee sweep",
  "Vol-scaled",
  "No rebalance",
];

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** random walk equity curve starting at 100, ending at `endVal`, with `roughness` */
function walkEquity(endVal: number, roughness: number, n = 64): number[] {
  const out: number[] = [100];
  let v = 100;
  const drift = (Math.log(endVal) - Math.log(100)) / (n - 1);
  for (let i = 1; i < n; i++) {
    const shock = (Math.random() - 0.5) * 2 * roughness;
    v = Math.max(20, v * Math.exp(drift + shock));
    out.push(v);
  }
  // pin final point
  out[n - 1] = endVal;
  return out.map((x) => round(x, 2));
}

function deriveDrawdown(equity: number[]): number[] {
  let peak = equity[0];
  return equity.map((v) => {
    peak = Math.max(peak, v);
    return round(((v - peak) / peak) * 100, 2); // <= 0
  });
}

function genMetrics(targetEnd: number, roughness: number, trades: number): RunMetrics {
  // roughness drives maxDD; trades drives winRate/PF around a coherent center
  const sharpe = round(Math.max(0.2, (targetEnd - 100) / 100 * 3.4 - roughness * 14 + rnd(0, 0.8)), 2);
  const maxDD = round(roughness * 40 * rnd(0.7, 1.3) + rnd(1, 4), 1);
  const sortino = round(sharpe * rnd(1.25, 1.7), 2);
  const winRate = round(Math.min(78, Math.max(38, 45 + sharpe * 5 + rnd(-4, 6))), 1);
  const profitFactor = round(Math.max(0.9, 0.8 + sharpe * 0.55 + rnd(-0.1, 0.2)), 2);
  const netPnl = round(1_000_000 * ((targetEnd / 100 - 1) * rnd(0.85, 1.15)), -4) / 10000; // $
  const cagr = round((targetEnd / 100 - 1) * rnd(1.4, 2.6) * 100, 1);
  return { netPnl, sharpe, sortino, maxDD, winRate, profitFactor, trades, cagr };
}

export function genRuns(): BacktestRun[] {
  const runs: BacktestRun[] = [];
  for (let i = 0; i < 6; i++) {
    const roughness = rnd(0.25, 0.9);
    const endVal = round(100 + rnd(-14, 68), 1);
    const trades = Math.floor(rnd(38, 920));
    const equityCurve = walkEquity(endVal, roughness);
    runs.push({
      id: uid(),
      label: pick(LABEL),
      strategy: STRATEGY[i % STRATEGY.length],
      symbol: SYMBOL[(i * 2) % SYMBOL.length],
      timeframe: TF[i % TF.length],
      rangeText: pick(RANGE),
      params: {
        lookback: pick([10, 20, 42, 120]),
        threshold: round(rnd(1.2, 3.6), 2),
        maxPos: pick([2, 3, 4, 5]),
        riskPct: pick([1, 2, 3, 5]),
      },
      metrics: genMetrics(endVal, roughness, trades),
      equityCurve,
      drawdown: deriveDrawdown(equityCurve),
    });
  }
  return runs;
}

function jitter(n: number, pct: number) {
  return n * (1 + (Math.random() - 0.5) * 2 * pct);
}

export function rerun(run: BacktestRun): BacktestRun {
  const roughness = rnd(0.25, 0.9);
  const endVal = round(jitter(run.equityCurve[63], 0.06), 1);
  const trades = Math.max(10, Math.floor(jitter(run.metrics.trades, 0.05)));
  const equityCurve = walkEquity(Math.max(25, endVal), roughness);
  return {
    ...run,
    metrics: genMetrics(Math.max(25, endVal), roughness, trades),
    equityCurve,
    drawdown: deriveDrawdown(equityCurve),
    // id preserved
  };
}

export type SortKey = "sharpe" | "netPnl" | "trades";

export function sortRuns(runs: BacktestRun[], key: SortKey): BacktestRun[] {
  return [...runs].sort((a, b) => b.metrics[key] - a.metrics[key]);
}

export function bestSharpe(runs: BacktestRun[]): number {
  return runs.reduce((m, r) => Math.max(m, r.metrics.sharpe), 0);
}

// ---------- V9: walk-forward, Monte-Carlo DD, sensitivity ----------
// Pure + deterministic: seeded from the run id (FNV-1a), no Math.random.

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sharpeOf(curve: number[]): number {
  if (curve.length < 3) return 0;
  const rets: number[] = [];
  for (let i = 1; i < curve.length; i++) rets.push(curve[i] / curve[i - 1] - 1);
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) * (r - mean), 0) / rets.length) || 1e-9;
  return (mean / sd) * Math.sqrt(curve.length / (curve.length - 1));
}

export interface WalkForward {
  folds: number;
  isSharpe: number;
  osSharpe: number;
  decay: number; // os/is ratio (1 = no decay, low = overfit)
  overfit: boolean;
}

/** k-fold walk-forward: IS = first k-1 folds, OS = final fold. */
export function walkForward(run: BacktestRun, folds = 4): WalkForward {
  const curve = run.equityCurve;
  const k = Math.max(2, folds);
  const per = Math.floor(curve.length / k);
  const isCurve = curve.slice(0, per * (k - 1));
  const osCurve = [isCurve[isCurve.length - 1], ...curve.slice(per * (k - 1))];
  const isS = sharpeOf(isCurve);
  const osS = sharpeOf(osCurve);
  const decay = isS > 0.01 ? osS / isS : 0;
  return { folds: k, isSharpe: isS, osSharpe: osS, decay, overfit: isS > 2 * Math.max(osS, 0.001) };
}

export interface MonteCarlo {
  n: number;
  p50: number;
  p95: number;
  p99: number;
  pLoss20: number; // % of paths with DD > 20%
}

/** Resample the run's bar returns (seeded) into N equity paths; report DD percentiles. */
export function monteCarlo(run: BacktestRun, n = 200): MonteCarlo {
  const rets: number[] = [];
  for (let i = 1; i < run.equityCurve.length; i++) rets.push(run.equityCurve[i] / run.equityCurve[i - 1] - 1);
  const rnd = mulberry32(fnv(run.id + run.symbol));
  const dds: number[] = [];
  for (let p = 0; p < n; p++) {
    let v = 100;
    let peak = 100;
    let dd = 0;
    for (let i = 0; i < rets.length; i++) {
      const j = Math.floor(rnd() * rets.length);
      v *= 1 + rets[j] * (0.5 + rnd()); // jitter draw magnitude
      peak = Math.max(peak, v);
      dd = Math.max(dd, (peak - v) / peak);
    }
    dds.push(dd * 100);
  }
  dds.sort((a, b) => a - b);
  const q = (f: number) => dds[Math.min(dds.length - 1, Math.floor(f * dds.length))];
  const pLoss20 = (dds.filter((d) => d > 20).length / dds.length) * 100;
  return { n, p50: q(0.5), p95: q(0.95), p99: q(0.99), pLoss20 };
}

export interface SensCell {
  x: number; // threshold multiplier
  y: number; // lookback multiplier
  sharpe: number;
  robust: boolean; // inside the flat region
}
export interface SensGrid {
  xs: number[];
  ys: number[];
  cells: SensCell[];
  best: SensCell;
}

/**
 * Grid the threshold × lookback multipliers around the run's params.
 * Sharpe surface = base Sharpe damped by distance from a soft optimum;
 * the flat region (≥70% of local best) is the robust zone.
 */
export function sensitivity(run: BacktestRun): SensGrid {
  const xs = [0.7, 0.85, 1.0, 1.15, 1.3];
  const ys = [0.5, 0.75, 1.0, 1.5, 2.0];
  const base = run.metrics.sharpe;
  const seed = fnv(run.id) % 7; // slight per-run asymmetry
  const cells: SensCell[] = [];
  let best: SensCell = { x: 1, y: 1, sharpe: -99, robust: false };
  for (const x of xs) {
    for (const y of ys) {
      const d = Math.pow(x - 1 - (seed % 3) * 0.05, 2) * 3.2 + Math.pow(y - 1.1 - (y < 1 ? 0.35 : 0), 2) * 2.2;
      const sharpe = Math.max(-0.4, base * Math.exp(-d));
      const c: SensCell = { x, y, sharpe, robust: false };
      cells.push(c);
      if (sharpe > best.sharpe) best = c;
    }
  }
  const maxInCell = Math.max(...cells.map((c) => c.sharpe));
  for (const c of cells) c.robust = maxInCell > 0.01 && c.sharpe >= maxInCell * 0.7;
  return { xs, ys, cells, best: { ...best, robust: true } };
}
