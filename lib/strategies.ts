// Strategy-engine domain model: rich per-strategy metrics, exposures,
// risk controls, and modeled projections. Data is seeded client-side and
// ticked to feel alive (see tickStrategies).

export type StrategyStatus = "live" | "paused" | "backtest" | "halted";
export type Bias = "long" | "short" | "both";
export type RiskTier = "low" | "medium" | "high";

export interface StrategyExposure {
  symbol: string;
  weight: number; // % of strategy notional
  pnl: number; // contribution in $
}

export interface StrategyParam {
  name: string;
  value: string;
  hint: string;
}

export interface Strategy {
  id: string;
  label: string; // display name
  tagline: string;
  bias: Bias;
  status: StrategyStatus;
  riskTier: RiskTier;
  version: string;
  engine: string; // model / solver in use
  universe: string[];
  // performance
  pnl: number; // realized + unrealized, $ (session)
  pnl30d: number; // 30d, $
  winRate: number; // %
  trades: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDD: number; // %
  avgHold: string;
  exposure: number; // % of book capital
  allocation: number; // % weight of total strategy book
  // risk controls (mutable via UI)
  riskScale: number; // position sizing %, 10-150
  stopLoss: number; // % of position, 1-15
  maxLeverage: number; // x, 1-5
  maxPositions: number; // 1-20
  baseVaR: number; // $ VaR95 at 100% risk scale
  // narrative + shape
  equity: number[]; // cumulative P&L curve (indexed time)
  symbols: StrategyExposure[];
  params: StrategyParam[];
  lastSignal: string;
  signalsToday: number;
  confidence: number; // 0-100 ensemble vote
}

// ---------- seeding helpers ----------

/** Random walk in $ that starts at 0 and always ends exactly at `final`. */
function pnlCurve(final: number, vol: number, n = 60): number[] {
  const out = [0];
  let v = 0;
  for (let i = 1; i < n; i++) {
    v += (Math.random() - 0.5) * vol;
    out.push(v);
  }
  const diff = final - out[out.length - 1];
  return out.map((x, i) => x + (diff * i) / (n - 1));
}

interface SeedSpec {
  id: string;
  label: string;
  tagline: string;
  bias: Bias;
  status: StrategyStatus;
  riskTier: RiskTier;
  version: string;
  engine: string;
  universe: string[];
  pnl: number;
  pnl30d: number;
  winRate: number;
  trades: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDD: number;
  avgHold: string;
  exposure: number;
  allocation: number;
  riskScale: number;
  stopLoss: number;
  maxLeverage: number;
  maxPositions: number;
  baseVaR: number;
  symbols: StrategyExposure[];
  params: StrategyParam[];
  lastSignal: string;
  signalsToday: number;
  confidence: number;
}

const SPECS: SeedSpec[] = [
  {
    id: "momentum-v4",
    label: "Momentum v4",
    tagline: "Breakout & trend-continuation across equities and crypto.",
    bias: "long",
    status: "live",
    riskTier: "medium",
    version: "v4.2.1",
    engine: "statistical · zscore+ml gate",
    universe: ["NVDA", "AMD", "TSLA", "COIN"],
    pnl: 4210,
    pnl30d: 61840,
    winRate: 62,
    trades: 148,
    sharpe: 2.31,
    sortino: 3.11,
    calmar: 4.8,
    maxDD: 3.1,
    avgHold: "42m",
    exposure: 24,
    allocation: 26,
    riskScale: 85,
    stopLoss: 4.5,
    maxLeverage: 2.4,
    maxPositions: 6,
    baseVaR: 3100,
    symbols: [
      { symbol: "NVDA", weight: 34, pnl: 1840 },
      { symbol: "AMD", weight: 28, pnl: 2110 },
      { symbol: "COIN", weight: 24, pnl: 620 },
      { symbol: "TSLA", weight: 14, pnl: -360 },
    ],
    params: [
      { name: "Entry trigger", value: "20d high break + vol ≥ 1.4σ", hint: "breakout gate" },
      { name: "Vol filter", value: "realized vs 20d ATR", hint: "skip calm tape" },
      { name: "Pyramiding", value: "max 3 adds · 0.5x per add", hint: "scale-in" },
      { name: "Exit", value: "Chandelier 2.2×ATR", hint: "trailing stop" },
      { name: "Cooldown", value: "45m post-rejection", hint: "avoid churn" },
    ],
    lastSignal: "LONG NVDA · breakout through 20d high",
    signalsToday: 11,
    confidence: 84,
  },
  {
    id: "mean-revert-ml",
    label: "Mean Revert · ML",
    tagline: "Fades statistical extremes using an ML net-flow score.",
    bias: "short",
    status: "live",
    riskTier: "high",
    version: "v2.9.0",
    engine: "nx-alpha 4.2 ensemble",
    universe: ["BTC-USD", "ETH-USD", "TSLA"],
    pnl: -620,
    pnl30d: 18220,
    winRate: 55,
    trades: 63,
    sharpe: 1.28,
    sortino: 1.74,
    calmar: 2.1,
    maxDD: 5.8,
    avgHold: "18m",
    exposure: 12,
    allocation: 14,
    riskScale: 60,
    stopLoss: 3.2,
    maxLeverage: 1.8,
    maxPositions: 4,
    baseVaR: 1900,
    symbols: [
      { symbol: "BTC-USD", weight: 48, pnl: -380 },
      { symbol: "ETH-USD", weight: 40, pnl: -120 },
      { symbol: "TSLA", weight: 12, pnl: -120 },
    ],
    params: [
      { name: "Z-gate", value: "fade only |z| > 2.5", hint: "tail entry" },
      { name: "ML gate", value: "net-flow score ±0.60", hint: "nx-alpha vote" },
      { name: "Reversion target", value: "vwap ± 0.35σ", hint: "take profit" },
      { name: "Time stop", value: "22m hard exit", hint: "no holding" },
      { name: "Squeeze guard", value: "skip when RV > 3× 30d", hint: "risk veto" },
    ],
    lastSignal: "SHORT BTC-USD · ML net-flow -0.77 below gate",
    signalsToday: 7,
    confidence: 66,
  },
  {
    id: "arb-cross-exch",
    label: "Cross-Exchange Arb",
    tagline: "Latency arbitrage capturing cross-venue spreads.",
    bias: "both",
    status: "live",
    riskTier: "low",
    version: "v3.5.2",
    engine: "low-latency · 3 venues",
    universe: ["BTC-USD", "ETH-USD", "COIN"],
    pnl: 940,
    pnl30d: 41260,
    winRate: 81,
    trades: 1240,
    sharpe: 3.12,
    sortino: 4.02,
    calmar: 9.6,
    maxDD: 1.1,
    avgHold: "410ms",
    exposure: 18,
    allocation: 22,
    riskScale: 100,
    stopLoss: 1.5,
    maxLeverage: 5,
    maxPositions: 20,
    baseVaR: 800,
    symbols: [
      { symbol: "BTC-USD", weight: 40, pnl: 420 },
      { symbol: "ETH-USD", weight: 35, pnl: 310 },
      { symbol: "COIN", weight: 25, pnl: 210 },
    ],
    params: [
      { name: "Spread gate", value: "> 2.5bp net of fees", hint: "entry edge" },
      { name: "Leg hedge", value: "sim-concurrent · 2 venues", hint: "delta off" },
      { name: "Unwind", value: "full on 15ms slippage", hint: "fat-finger trip" },
      { name: "Inventory cap", value: "≤ 6% per venue", hint: "venue risk" },
      { name: "Fee budget", value: "taker/taker preferred", hint: "cost model" },
    ],
    lastSignal: "PAIR BTC-USD · 3.1bp captured $412",
    signalsToday: 212,
    confidence: 92,
  },
  {
    id: "funding-capture",
    label: "Funding Capture",
    tagline: "Carries perps funding rates, delta-neutral.",
    bias: "long",
    status: "live",
    riskTier: "low",
    version: "v2.1.7",
    engine: "delta-neutral carry",
    universe: ["ETH-USD", "BTC-USD", "COIN"],
    pnl: 3120,
    pnl30d: 52910,
    winRate: 71,
    trades: 96,
    sharpe: 1.87,
    sortino: 2.41,
    calmar: 3.9,
    maxDD: 2.4,
    avgHold: "8h",
    exposure: 20,
    allocation: 20,
    riskScale: 95,
    stopLoss: 2.8,
    maxLeverage: 3,
    maxPositions: 8,
    baseVaR: 1400,
    symbols: [
      { symbol: "ETH-USD", weight: 50, pnl: 1560 },
      { symbol: "BTC-USD", weight: 35, pnl: 1080 },
      { symbol: "COIN", weight: 15, pnl: 480 },
    ],
    params: [
      { name: "Carry gate", value: "annualized > 14%", hint: "yield floor" },
      { name: "Hedge ratio", value: "0.97× spot index", hint: "residual δ" },
      { name: "Rebalance", value: "on 8h funding print", hint: "capture cadence" },
      { name: "Basis guard", value: "exit if perp < spot", hint: "negative basis" },
      { name: "Venue pool", value: "top-3 by depth", hint: "liquidity" },
    ],
    lastSignal: "FLAT → CARRY ETH-USD · APY 18.4% locked",
    signalsToday: 9,
    confidence: 88,
  },
  {
    id: "vol-breakout",
    label: "Vol Breakout",
    tagline: "Sits out calm tape, fires on realized-vol expansion.",
    bias: "long",
    status: "live",
    riskTier: "high",
    version: "v1.8.0",
    engine: "statistical · GARCH",
    universe: ["AMD", "NVDA", "TSLA"],
    pnl: 1540,
    pnl30d: 27430,
    winRate: 49,
    trades: 121,
    sharpe: 1.42,
    sortino: 1.98,
    calmar: 2.4,
    maxDD: 6.9,
    avgHold: "2h 10m",
    exposure: 15,
    allocation: 12,
    riskScale: 70,
    stopLoss: 5.5,
    maxLeverage: 2.8,
    maxPositions: 5,
    baseVaR: 2200,
    symbols: [
      { symbol: "AMD", weight: 40, pnl: 940 },
      { symbol: "NVDA", weight: 30, pnl: 380 },
      { symbol: "TSLA", weight: 30, pnl: 220 },
    ],
    params: [
      { name: "RV gate", value: "RV(1h) > 2.5× 30d median", hint: "expansion only" },
      { name: "Entry", value: "first 15m bar of expansion", hint: "early fill" },
      { name: "Sizing", value: "inverse-vol 8% target", hint: "risk parity" },
      { name: "Exit", value: "RV decay < 1.2× for 2 bars", hint: "fade out" },
      { name: "News filter", value: "no entries on high-impact", hint: "macro guard" },
    ],
    lastSignal: "LONG AMD · RV expansion 3.1× detected",
    signalsToday: 4,
    confidence: 61,
  },
  {
    id: "orderflow-imb",
    label: "Orderflow Imbalance",
    tagline: "Reads tape + book imbalance for directional skew.",
    bias: "short",
    status: "paused",
    riskTier: "medium",
    version: "v2.3.4",
    engine: "nx-alpha 4.2 · book L2+L3",
    universe: ["TSLA", "NVDA", "COIN"],
    pnl: 480,
    pnl30d: 19860,
    winRate: 58,
    trades: 74,
    sharpe: 1.64,
    sortino: 2.22,
    calmar: 3.0,
    maxDD: 4.4,
    avgHold: "9m",
    exposure: 9,
    allocation: 6,
    riskScale: 45,
    stopLoss: 4.0,
    maxLeverage: 2.0,
    maxPositions: 6,
    baseVaR: 1600,
    symbols: [
      { symbol: "TSLA", weight: 36, pnl: 420 },
      { symbol: "NVDA", weight: 34, pnl: -180 },
      { symbol: "COIN", weight: 30, pnl: 240 },
    ],
    params: [
      { name: "Imbalance gate", value: "bid/ask ≥ 62% for 3 prints", hint: "pressure" },
      { name: "Absorption", value: "Δ size > 1.8× avg", hint: "iceberg read" },
      { name: "Cancel velocity", value: "orders/ms anomaly", hint: "spoof filter" },
      { name: "Entry", value: "2-tick confirmation", hint: "fill trigger" },
      { name: "Exit", value: "imbalance flip or 12m", hint: "fast out" },
    ],
    lastSignal: "SHORT TSLA · ask wall 4.2% rejected ×3",
    signalsToday: 0,
    confidence: 54,
  },
];

export function seedStrategies(): Strategy[] {
  return SPECS.map((s) => ({
    ...s,
    equity: pnlCurve(s.pnl, Math.max(180, Math.abs(s.pnl) / 5 + 120)),
  }));
}

/** One engine tick — nudge live strategies' session P&L, confidence, signals. */
export function tickStrategies(list: Strategy[]): Strategy[] {
  return list.map((s) => {
    if (s.status !== "live") return s;
    const bump = (Math.random() - 0.46) * (s.id === "arb-cross-exch" ? 14 : 90);
    const pnl = Math.round(s.pnl + bump);
    return {
      ...s,
      pnl,
      equity: [...s.equity.slice(1), pnl],
      signalsToday: s.signalsToday + (Math.random() > (s.id === "arb-cross-exch" ? 0.75 : 0.85) ? 1 : 0),
      confidence: Math.round(Math.min(99, Math.max(40, s.confidence + (Math.random() - 0.5) * 3))),
    };
  });
}

// ---------- modeled risk envelope ----------

export interface Projection {
  sizingPct: number;
  effLeverage: number;
  estVar: number; // $ VaR95 after risk scaling
  worstDD: number; // % modeled
  capitalInUse: number; // $
}

const CAPITAL = 1_000_000;
export { CAPITAL };

export function project(s: Strategy): Projection {
  const scale = s.riskScale / 100;
  return {
    sizingPct: s.riskScale,
    effLeverage: +(s.maxLeverage * scale).toFixed(1),
    estVar: Math.round(s.baseVaR * scale),
    worstDD: +(s.maxDD * (0.6 + scale * 0.6)).toFixed(1),
    capitalInUse: Math.round((CAPITAL * s.exposure) / 100 * scale),
  };
}

// ---------- aggregate stats ----------

export interface BookStats {
  live: number;
  total: number;
  pnl: number;
  pnl30d: number;
  blendedSharpe: number;
  avgWinRate: number;
  totalTrades: number;
  exposure: number;
  top: Strategy;
  bottom: Strategy;
}

export function bookStats(list: Strategy[]): BookStats {
  const live = list.filter((s) => s.status === "live");
  const w = live.reduce((a, s) => a + Math.max(0, s.allocation), 0) || 1;
  return {
    live: live.length,
    total: list.length,
    pnl: list.reduce((a, s) => a + s.pnl, 0),
    pnl30d: list.reduce((a, s) => a + s.pnl30d, 0),
    blendedSharpe: +(live.reduce((a, s) => a + s.sharpe * s.allocation, 0) / w).toFixed(2),
    avgWinRate: Math.round(list.reduce((a, s) => a + s.winRate, 0) / list.length),
    totalTrades: list.reduce((a, s) => a + s.trades, 0),
    exposure: list.reduce((a, s) => a + (s.status === "live" ? s.exposure : 0), 0),
    top: [...list].sort((a, b) => b.pnl - a.pnl)[0],
    bottom: [...list].sort((a, b) => a.pnl - b.pnl)[0],
  };
}
