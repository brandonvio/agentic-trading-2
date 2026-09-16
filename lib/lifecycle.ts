// V9 — Strategy lifecycle: template → backtested → paper → live (+killed).
// Pure and deterministic: gates are computable, transitions are exhaustive,
// AI signoff comes from the V6 brain (rankModels), never from copy.

import { MODELS, featuresFor, rankModels } from "./brain";
import type { BacktestRun } from "./backtests";

export type StratState = "template" | "backtested" | "paper" | "live" | "killed";

export interface StratRisk {
  stopPct: number; // per-position stop, %
  sizeUsd: number; // notional per trade
  dailyLossCap: number; // $
  maxCorr: number; // 0-1 max pairwise corr to live book
}

export interface StratStats {
  winRate: number; // 0-1
  sharpe: number;
  maxDD: number; // %
  trades: number;
}

export interface Strat {
  id: string;
  name: string;
  modelId: string; // V6 model that fires it
  symbol: string; // primary instrument
  universe: string[];
  params: Record<string, number>;
  risk: StratRisk | null;
  state: StratState;
  stateSince: string; // "2h" | "3d" | …
  stats: StratStats;
  pnlUsd: number;
  drift: number; // 0-1 (V6 registry)
  killReason?: string;
  signoff?: string; // AI signoff line for live
}

export type StratAction =
  | "backtested" // template → backtested (backtest completed)
  | "toPaper" // backtested → paper
  | "goLive" // paper → live (requires gates)
  | "kill" // live → killed
  | "reGate"; // killed → paper

/** Exhaustive state machine — returns null for illegal moves (UI hides them). */
export function nextState(s: StratState, a: StratAction): StratState | null {
  if (s === "template" && a === "backtested") return "backtested";
  if (s === "backtested" && a === "toPaper") return "paper";
  if (s === "paper" && a === "goLive") return "live";
  if (s === "live" && a === "kill") return "killed";
  if (s === "killed" && a === "reGate") return "paper";
  return null;
}

export function allowedActions(s: StratState): StratAction[] {
  const all: StratAction[] = ["backtested", "toPaper", "goLive", "kill", "reGate"];
  return all.filter((a) => nextState(s, a));
}

// ---------- go-live gates ----------

export interface GateResult {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface GateReport {
  ok: boolean;
  gates: GateResult[];
  aiSignoff: boolean;
  line: string; // signoff line (or "not requested")
}

export interface AiSignoffInput {
  symbol: string;
  history: number[];
  riskOff: boolean;
}

/** V6 signoff: the symbol's best model fires a direction with score ≥ 0.55. */
export function aiSignoff(inp: AiSignoffInput): { ok: boolean; line: string } {
  const f = featuresFor(inp.symbol, inp.history, inp.riskOff);
  const top = rankModels(inp.symbol, f)[0];
  if (!top) return { ok: false, line: "no model covers this instrument" };
  const ok = top.side !== "FLAT" && top.confidence >= 55;
  return { ok, line: `${top.modelId} ${top.side} @ conf ${top.confidence} — ${top.reason}` };
}

/** goLive: risk params mandatory; metric gates overridable by V6 signoff. */
export function goLive(strat: Strat, sign?: AiSignoffInput): GateReport {
  const s = strat.stats;
  const risk = strat.risk;
  const gates: GateResult[] = [
    {
      id: "risk",
      label: "Risk params set",
      pass: !!(risk && risk.stopPct > 0 && risk.sizeUsd > 0 && risk.dailyLossCap > 0 && risk.maxCorr >= 0),
      detail: risk ? `stop ${risk.stopPct}% · $${(risk.sizeUsd / 1000).toFixed(0)}k · cap $${(risk.dailyLossCap / 1000).toFixed(0)}k · corr ≤ ${risk.maxCorr}` : "stop/size/cap/corr all required",
    },
    { id: "win", label: "Win rate > 50%", pass: s.winRate > 0.5, detail: `${(s.winRate * 100).toFixed(1)}% over ${s.trades} trades` },
    { id: "sharpe", label: "Sharpe > 1.0", pass: s.sharpe > 1, detail: s.sharpe.toFixed(2) + " out-of-sample" },
    { id: "dd", label: "Max DD < 10%", pass: s.maxDD < 10, detail: `${s.maxDD.toFixed(1)}%` },
  ];
  const signoff = sign ? aiSignoff(sign) : { ok: false, line: "not requested" };
  const riskPass = gates[0].pass;
  // Metric gates must all pass, OR a V6 signoff overrides them. Risk params are non-negotiable.
  const ok = riskPass && (gates.slice(1).every((g) => g.pass) || signoff.ok);
  return { ok, gates, aiSignoff: signoff.ok, line: signoff.line };
}

/** Adapt a v1 backtest run into a lifecycle strategy candidate. */
export function runToStrat(run: BacktestRun): Strat {
  const m = run.metrics;
  return {
    id: `BT-${run.id}`,
    name: `${run.strategy} · ${run.symbol} ${run.timeframe}`,
    modelId: "mom-4.2",
    symbol: run.symbol,
    universe: [run.symbol],
    params: { ...run.params },
    risk: null,
    state: "backtested",
    stateSince: run.rangeText,
    stats: { winRate: m.winRate / 100, sharpe: m.sharpe, maxDD: m.maxDD, trades: m.trades },
    pnlUsd: m.netPnl,
    drift: 0.2,
  };
}

// ---------- AI param suggest (V6-driven, pure) ----------

export interface SuggestedParams {
  params: Record<string, number>;
  rationale: string;
  modelId: string;
}

/**
 * Suggest a param candidate from the symbol's best V6 model:
 * weight-magnitude sets confidence → sizing; sign of momZ → bias/stop tightness.
 * Fully deterministic on (hist, riskOff).
 */
export function aiSuggestParams(symbol: string, hist: number[], riskOff: boolean): SuggestedParams {
  const f = featuresFor(symbol, hist, riskOff);
  const ranked = rankModels(symbol, f);
  const top = ranked[0];
  if (!top) return { params: { lookback: 120, threshold: 1.5, maxPos: 3, riskPct: 1 }, rationale: "no model — defaults", modelId: "—" };
  const topModel = MODELS.find((mm) => mm.id === top.modelId) ?? MODELS[0];
  const w = topModel.weights;
  const mom = Math.abs(w.momZ ?? 0.3);
  const lookback = Math.round(60 + mom * 180); // stronger momentum → longer lookback
  const threshold = Number((1 + (0.5 - Math.min(0.5, Math.abs(f.momZ))) * 0.8).toFixed(2));
  const maxPos = top.side === "FLAT" ? 2 : w.bookImb ? 4 : 3;
  const riskPct = top.confidence >= 60 ? 1.5 : 1;
  return {
    params: { lookback, threshold, maxPos, riskPct },
    rationale: `${top.modelId} ${top.side} (conf ${top.confidence}): ${top.reason} → sized ${riskPct}%/trade, ${maxPos} max positions`,
    modelId: top.modelId,
  };
}

// ---------- apply transitions ----------

export function applyAction(s: Strat, a: StratAction, now: string): Strat {
  const ns = nextState(s.state, a);
  if (!ns) return s;
  if (a === "kill") return { ...s, state: ns, stateSince: now, killReason: s.drift >= 0.8 ? "drift ≥ 0.8 (V6 auto-pause)" : "drawdown cap breached", pnlUsd: Math.round(s.pnlUsd) };
  if (a === "goLive") return { ...s, state: ns, stateSince: now, killReason: undefined, signoff: s.signoff };
  return { ...s, state: ns, stateSince: now, killReason: undefined };
}

// ---------- seeds (map v1 strategies onto lifecycle states) ----------

export function seedStrategiesV2(): Strat[] {
  return [
    {
      id: "L1", name: "Momentum v4.2 · NVDA", modelId: "mom-4.2", symbol: "NVDA", universe: ["NVDA", "TSLA", "AMD"],
      params: { lookback: 120, threshold: 1.5, maxPos: 3, riskPct: 1.5 },
      risk: { stopPct: 2, sizeUsd: 25000, dailyLossCap: 7500, maxCorr: 0.8 },
      state: "live", stateSince: "3d", stats: { winRate: 0.58, sharpe: 1.42, maxDD: 6.1, trades: 141 },
      pnlUsd: 18240, drift: 0.22, signoff: "mom-4.2 BUY @ 0.66 — momZ 2.1 trending + spread < 2bps",
    },
    {
      id: "L2", name: "Orderflow Imb · BTC", modelId: "flow-imb", symbol: "BTC-USD", universe: ["BTC-USD", "ETH-USD", "SOL-USD"],
      params: { lookback: 40, threshold: 1.1, maxPos: 4, riskPct: 1 },
      risk: { stopPct: 1.2, sizeUsd: 12000, dailyLossCap: 3600, maxCorr: 0.7 },
      state: "live", stateSince: "12d", stats: { winRate: 0.61, sharpe: 1.18, maxDD: 8.4, trades: 322 },
      pnlUsd: 9630, drift: 0.41,
    },
    {
      id: "L3", name: "Funding Capture v3", modelId: "fund-capt", symbol: "ETH-USD", universe: ["ETH-USD", "SOL-USD", "ARB-USD"],
      params: { lookback: 24, threshold: 0.9, maxPos: 3, riskPct: 1 },
      risk: { stopPct: 1.5, sizeUsd: 9000, dailyLossCap: 2700, maxCorr: 0.6 },
      state: "paper", stateSince: "6d", stats: { winRate: 0.54, sharpe: 1.24, maxDD: 5.2, trades: 88 },
      pnlUsd: 3110, drift: 0.18,
    },
    {
      id: "L4", name: "Mean-Revert ML (challenger)", modelId: "mr-ml", symbol: "SPY", universe: ["SPY", "QCOM"],
      params: { lookback: 90, threshold: 1.8, maxPos: 2, riskPct: 1 },
      risk: null,
      state: "backtested", stateSince: "1d", stats: { winRate: 0.52, sharpe: 0.94, maxDD: 8.8, trades: 64 },
      pnlUsd: 0, drift: 0.31,
    },
    {
      id: "L5", name: "Cross-Venue Arb (new)", modelId: "flow-imb", symbol: "BTC-USD", universe: ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"],
      params: { lookback: 16, threshold: 0.8, maxPos: 4, riskPct: 0.5 },
      risk: null, state: "template", stateSince: "2h", stats: { winRate: 0, sharpe: 0, maxDD: 0, trades: 0 },
      pnlUsd: 0, drift: 0,
    },
    {
      id: "L6", name: "Vol Arb v2 · SOL", modelId: "volarb-2", symbol: "SOL-USD", universe: ["SOL-USD", "PEPE-USD"],
      params: { lookback: 60, threshold: 1.4, maxPos: 3, riskPct: 1 },
      risk: { stopPct: 1.8, sizeUsd: 7000, dailyLossCap: 2100, maxCorr: 0.7 },
      state: "killed", stateSince: "1d", stats: { winRate: 0.44, sharpe: 0.41, maxDD: 12.9, trades: 176 },
      pnlUsd: -4280, drift: 0.87, killReason: "drift ≥ 0.8 (V6 auto-pause)",
    },
  ];
}
