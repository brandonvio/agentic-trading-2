// lib/agent.ts — autopilot observer stream, pure.

import { pick, round, uid } from "./market";

export type StepKind = "thought" | "tool" | "observe" | "decision";

export interface AgentStep {
  id: string;
  tsAgoSec: number;
  kind: StepKind;
  text: string;
  tool?: string;
  ms?: number;
  tokens?: number;
}

export interface AgentState {
  steps: AgentStep[]; // newest-first, cap 40
  confidence: number; // 55–96
  prevConfidence: number;
  tokensTotal: number;
  lastMs: number;
}

const SYM = ["BTC-USD", "ETH-USD", "SOL-USD", "NVDA", "TSLA", "AMD", "COIN"];
const STRAT = ["Momentum v4", "Funding Capture", "Cross-Venue Arb", "Vol Arb v2", "Orderflow Imbalance"];
const VENUE = ["OKX", "BINANCE", "COINBASE"];

const THOUGHT: string[] = [
  `spread on ${pick(SYM)} compressed to ${(0.4 + Math.random() * 1.4).toFixed(2)} bps — edge thinning`,
  `adverse selection rising on ${pick(VENUE)} maker flow over last 5min`,
  `funding flipped on ${pick(SYM)} — carry leg of ${pick(STRAT)} worth re-pricing`,
  `vol term structure steepening; IV1M ${round(14 + Math.random() * 20, 1)}%`,
  `orderbook imbalance on ${pick(SYM)} tilted ${(0.1 + Math.random() * 0.5).toFixed(2)} long`,
  `drawdown budget at ${round(18 + Math.random() * 22, 0)}% consumed on ${pick(STRAT)}`,
  `news window: ${pick(["FOMC 30min out", "CPI print in 12min", "quiet macro tape", "ETF flow window"])}`,
  `inventory skew across venues; internal hedges ${pick(["flat", "+2 contracts", "-1 contract"])}`,
];

const TOOLS: [string, string][] = [
  ["get_book", `${pick(SYM)} L2 depth`],
  ["funding_rate", `${pick(SYM)} basis points`],
  ["backtest_slice", `${pick(STRAT)} 3d replay`],
  ["vol_scan", `${pick(SYM)} term structure`],
  ["position_snap", "book + margin"],
  ["latency_check", `${pick(VENUE)} p99`],
];

const OBSERVE: string[] = [
  `depth ratio ${(0.8 + Math.random() * 0.6).toFixed(2)} — consistent with thesis`,
  `latency p99 ${(40 + Math.random() * 90).toFixed(0)}ms on ${pick(VENUE)} — within budget`,
  `replay PnL ${round(Math.random() * 140 - 30, 0)} on sample ${Math.floor(20 + Math.random() * 90)} fills`,
  `spread tick count ${Math.floor(3 + Math.random() * 20)} — book quality ok`,
  `margin headroom ${(1.6 + Math.random() * 1.6).toFixed(2)}× after proposed size`,
  `cross-venue basis ${(Math.random() * 0.4).toFixed(3)}% — arb window ${Math.random() < 0.5 ? "open" : "closed"}`,
];

const DECISION: string[] = [
  `hold ${pick(STRAT)} — no fresh edge, budget preserved`,
  `reduce ${pick(STRAT)} 25% — edge decay on ${pick(SYM)}`,
  `add ${round(0.2 + Math.random() * 1.4)} ${pick(SYM)} via ${pick(VENUE)} — sized to 4% risk`,
  `stand down on ${pick(SYM)} — adverse fill probability ${(45 + Math.random() * 30).toFixed(0)}%`,
  `shift venue ${pick(VENUE)} → ${pick(VENUE)} for next leg — fee+latency net better`,
  `hold flat — guardrail: model drift monitor above 2σ`,
];

function step(kind: StepKind, tsAgoSec: number, text: string, tool?: string, ms?: number, tokens?: number): AgentStep {
  return { id: uid(), tsAgoSec, kind, text, tool, ms, tokens };
}

export function seedAgent(): AgentState {
  const rows: AgentStep[] = [];
  const ago = [2, 4, 7, 11, 15, 22, 30, 41, 55, 72];
  const kinds: StepKind[] = ["thought", "tool", "observe", "decision", "thought", "tool", "observe", "thought", "tool", "observe"];
  for (let i = 0; i < ago.length; i++) {
    const k = kinds[i];
    if (k === "thought") rows.push(step("thought", ago[i], pick(THOUGHT)));
    else if (k === "tool") {
      const [t, d] = TOOLS[i % TOOLS.length];
      rows.push(step("tool", ago[i], `called ${t}(${d})`, t, Math.floor(12 + Math.random() * 220), Math.floor(40 + Math.random() * 240)));
    } else if (k === "observe") rows.push(step("observe", ago[i], pick(OBSERVE)));
    else rows.push(step("decision", ago[i], pick(DECISION)));
  }
  return {
    steps: rows,
    confidence: 87,
    prevConfidence: 85,
    tokensTotal: Math.floor(48_000 + Math.random() * 90_000),
    lastMs: 412,
  };
}

export function tickAgent(state: AgentState): AgentState {
  const n = 1 + (Math.random() < 0.4 ? 1 : 0);
  const fresh: AgentStep[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.34) fresh.push(step("thought", 0, pick(THOUGHT), undefined, undefined, Math.floor(80 + Math.random() * 320)));
    else if (r < 0.62) {
      const [t, d] = pick(TOOLS);
      fresh.push(step("tool", 0, `called ${t}(${d})`, t, Math.floor(12 + Math.random() * 260), Math.floor(60 + Math.random() * 420)));
    } else if (r < 0.88) fresh.push(step("observe", 0, pick(OBSERVE), undefined, undefined, Math.floor(40 + Math.random() * 160)));
    else fresh.push(step("decision", 0, pick(DECISION), undefined, undefined, Math.floor(120 + Math.random() * 480)));
  }
  const age = state.steps.map((s) => ({ ...s, tsAgoSec: s.tsAgoSec + 2 })).slice(0, 40);
  const drift = Math.round((Math.random() - 0.48) * 6); // ±3, slight upside bias
  const confidence = Math.min(96, Math.max(55, state.confidence + drift));
  const tokensNow = fresh.reduce((a, s) => a + (s.tokens ?? 0), 0);
  const msNow = fresh.reduce((a, s) => Math.max(a, s.ms ?? 0), 0);
  return {
    steps: [...fresh, ...age].slice(0, 40),
    confidence,
    prevConfidence: state.confidence,
    tokensTotal: state.tokensTotal + tokensNow,
    lastMs: msNow || state.lastMs,
  };
}

// one-shot: forced thought → tool → observe → decision
export function burstAgent(state: AgentState): AgentState {
  const [t, d] = pick(TOOLS);
  const seq: AgentStep[] = [
    step("thought", 0, pick(THOUGHT), undefined, undefined, Math.floor(200 + Math.random() * 300)),
    step("tool", 0, `called ${t}(${d})`, t, Math.floor(20 + Math.random() * 200), Math.floor(120 + Math.random() * 300)),
    step("observe", 0, pick(OBSERVE), undefined, undefined, Math.floor(60 + Math.random() * 180)),
    step("decision", 0, pick(DECISION), undefined, undefined, Math.floor(300 + Math.random() * 400)),
  ];
  const tokensNow = seq.reduce((a, s) => a + (s.tokens ?? 0), 0);
  return {
    ...state,
    steps: [...seq, ...state.steps].slice(0, 40),
    confidence: Math.round(state.confidence + (Math.random() < 0.6 ? 0 : 1)),
    tokensTotal: state.tokensTotal + tokensNow,
  };
}

export function resetAgent(): AgentState {
  const s = seedAgent();
  s.confidence = 87;
  s.prevConfidence = 87;
  s.tokensTotal = 0;
  return s;
}

export function fmtAgentAge(sec: number): string {
  if (sec <= 2) return "now";
  if (sec < 60) return `${sec}s`;
  if (sec < 3_600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3_600)}h`;
}
