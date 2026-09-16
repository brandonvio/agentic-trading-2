import { nowTime, pick, rand, uid } from "./market";

// ---------- types ----------

export type SignalSide = "LONG" | "SHORT";

export type SignalStatus =
  | "ACTIVE" // order live, not yet filled
  | "FILLED" // filled, position open
  | "CLOSED" // target hit
  | "STOPPED" // stop hit
  | "REJECTED" // killed pre-fill
  | "EXPIRED"; // timed out

export interface SignalFactor {
  name: string;
  score: number; // -100 .. +100 (signed: + favors signal direction)
}

export interface TradedSignal {
  id: string;
  time: string; // HH:MM:SS at generation
  symbol: string;
  side: SignalSide;
  engineId: string;
  engine: string;
  venue: string;
  entry: number;
  target: number;
  stop: number;
  sizeUsd: number;
  confidence: number; // 0-100
  edgeBps: number;
  status: SignalStatus;
  holdMin: number; // minutes held (FILLED / closed)
  pnlUsd: number | null; // realized once closed
  factors: SignalFactor[];
  kills: string[];
  // brain alignment (V6): signals are decisions from named models
  modelId?: string;
  score?: number;
  attributions?: { feature: string; contribution: number }[];
}

// ---------- seeds ----------

const SYMBOLS = [
  { sym: "ETH-USD", px: 3421.5 },
  { sym: "BTC-USD", px: 97412 },
  { sym: "SOL-USD", px: 188.42 },
  { sym: "TSLA", px: 254.1 },
  { sym: "NVDA", px: 133.9 },
  { sym: "AMD", px: 168.7 },
  { sym: "COIN", px: 246.2 },
];

export const ENGINES = [
  { id: "orderflow-imb", label: "Orderflow Imbalance" },
  { id: "momentum-v4", label: "Momentum v4" },
  { id: "mean-revert-ml", label: "Mean Revert ML" },
  { id: "funding-capture", label: "Funding Capture" },
  { id: "arb-cross-exch", label: "Cross-Exchange Arb" },
];

const VENUES = ["OKX · T0", "BINANCE · T1", "COINBASE · T2", "ARBITRAGE"];

const FACTORS = ["momentum", "volume", "orderflow", "funding", "volatility", "mean-rev", "liquidity"];

const KILLS = [
  "Invalidate if 5m volume drops > 40%",
  "Skip if venue spread > 2.5 bp",
  "Kill on funding flip to +0.03%",
  "Stand down if delta < 0.6 on next candle",
  "No re-entry before 2m cooldown",
  "Re-quote if book depth < 1.2× size",
];

// ---------- builders ----------

const factorsFor = (n = 5): SignalFactor[] =>
  Array.from({ length: n }, () => ({
    name: pick(FACTORS),
    score: Math.round(rand(-90, 90)),
  }));

export function makeSignal(status: SignalStatus = "ACTIVE"): TradedSignal {
  const s = pick(SYMBOLS);
  const side: SignalSide = Math.random() < 0.54 ? "LONG" : "SHORT";
  const entry = s.px * (1 + rand(-0.0024, 0.0024));
  const targetRatio = rand(0.0012, 0.0042);
  const stopRatio = rand(0.0022, 0.006);
  const sign = side === "LONG" ? 1 : -1;
  const target = side === "LONG" ? entry * (1 + targetRatio) : entry * (1 - targetRatio);
  const stop = side === "LONG" ? entry * (1 - stopRatio) : entry * (1 + stopRatio);
  const closed = status === "CLOSED" || status === "STOPPED" || status === "EXPIRED";
  const sizeUsd = Math.round(rand(18, 640) * 1000 / 500) * 500;

  let pnlUsd: number | null = null;
  if (closed) {
    if (status === "CLOSED") pnlUsd = sizeUsd * targetRatio * sign * rand(0.8, 1.15);
    else if (status === "STOPPED") pnlUsd = -sizeUsd * stopRatio * rand(0.7, 1.0);
    else pnlUsd = sizeUsd * sign * rand(-0.0004, 0.0009);
    pnlUsd = Math.round(pnlUsd);
  }

  return {
    id: uid(),
    time: nowTime(),
    symbol: s.sym,
    side,
    engineId: pick(ENGINES).id,
    engine: pick(ENGINES).label,
    venue: pick(VENUES),
    entry: round2(entry),
    target: round2(target),
    stop: round2(stop),
    sizeUsd,
    confidence: Math.round(rand(52, 97)),
    edgeBps: Math.round(rand(4, 46)),
    status,
    holdMin: closed ? Math.round(rand(1, 42)) : 0,
    pnlUsd,
    factors: factorsFor(),
    kills: [pick(KILLS), pick(KILLS)],
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function seedSignals(): TradedSignal[] {
  const mix: SignalStatus[] = [
    "ACTIVE",
    "FILLED",
    "CLOSED",
    "FILLED",
    "STOPPED",
    "ACTIVE",
    "CLOSED",
    "REJECTED",
    "FILLED",
    "CLOSED",
    "ACTIVE",
    "EXPIRED",
  ];
  return mix.map((st) => makeSignal(st));
}

// ---------- live tick ----------

export type SignalAction = "fill" | "cancel" | "close";

export function actOnSignal(list: TradedSignal[], id: string, action: SignalAction): TradedSignal[] {
  return list.map((s) => {
    if (s.id !== id) return s;
    if (action === "fill" && s.status === "ACTIVE") {
      return { ...s, status: "FILLED" as const, holdMin: 0, time: nowTime() };
    }
    if (action === "cancel" && s.status === "ACTIVE") {
      return { ...s, status: "REJECTED" as const };
    }
    if (action === "close" && s.status === "FILLED") {
      const dir = s.side === "LONG" ? 1 : -1;
      const closePx = s.entry + dir * Math.abs(s.target - s.entry) * rand(0.15, 1.25);
      const pnl = Math.round(((closePx - s.entry) / s.entry) * s.sizeUsd * dir);
      return { ...s, status: pnl >= 0 ? ("CLOSED" as const) : ("STOPPED" as const), pnlUsd: pnl };
    }
    return s;
  });
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function tickSignals(list: TradedSignal[]): TradedSignal[] {
  const l = list.map((s) => ({ ...s }));
  const act = l.filter((s) => s.status === "ACTIVE");
  const fil = l.filter((s) => s.status === "FILLED");

  for (const s of act) s.confidence = Math.round(clamp(s.confidence + (Math.random() - 0.5) * 3, 40, 98));
  for (const s of fil) s.holdMin = +(s.holdMin + 0.04).toFixed(2);

  const r = Math.random();
  if (r < 0.22 && fil.length) {
    const s = pick(fil);
    const dir = s.side === "LONG" ? 1 : -1;
    const targetRatio = Math.abs(s.target - s.entry) / s.entry;
    const stopRatio = Math.abs(s.entry - s.stop) / s.entry;
    const q = Math.random();
    if (q < 0.5) s.status = "CLOSED";
    else if (q < 0.82) s.status = "STOPPED";
    else s.status = "EXPIRED";
    s.pnlUsd =
      s.status === "CLOSED"
        ? Math.round(s.sizeUsd * targetRatio * dir * rand(0.8, 1.15))
        : s.status === "STOPPED"
          ? Math.round(-s.sizeUsd * stopRatio * rand(0.7, 1))
          : Math.round(s.sizeUsd * dir * rand(-0.0004, 0.0009));
  } else if (r < 0.4 && act.length) {
    const s = pick(act);
    s.status = "FILLED";
    s.holdMin = 0;
  } else if (r < 0.5 && act.length) {
    const s = pick(act);
    s.status = "REJECTED";
  }

  if (Math.random() < 0.42) l.unshift(makeSignal("ACTIVE"));
  return l.slice(0, 34);
}

// ---------- stats ----------

export interface FeedStats {
  open: number; // ACTIVE + FILLED
  filled: number;
  closed: number;
  stopped: number;
  rejected: number;
  expire: number;
  fillRate: number; // % that got through the door
  hitRate: number; // closed / (closed + stopped)
  avgEdge: number; // bps
  realized: number; // sum of realized pnl
  gross: number; // realized + open notional at risk
  openNotional: number;
}

export function feedStats(list: TradedSignal[]): FeedStats {
  const count = (st: SignalStatus) => list.filter((s) => s.status === st).length;
  const active = count("ACTIVE");
  const filled = count("FILLED");
  const closed = count("CLOSED");
  const stopped = count("STOPPED");
  const rejected = count("REJECTED");
  const expired = count("EXPIRED");
  const realized = list.reduce((a, s) => a + (s.pnlUsd ?? 0), 0);
  const openNotional = list
    .filter((s) => s.status === "ACTIVE" || s.status === "FILLED")
    .reduce((a, s) => a + s.sizeUsd, 0);
  const fillRate = list.length ? Math.round(((list.length - rejected) / list.length) * 100) : 100;
  const hitRate = closed + stopped ? Math.round((closed / (closed + stopped)) * 100) : 100;
  const avgEdge = list.length ? Math.round(list.reduce((a, s) => a + s.edgeBps, 0) / list.length) : 0;
  return {
    open: active + filled,
    filled,
    closed,
    stopped,
    rejected,
    expire: expired,
    fillRate,
    hitRate,
    avgEdge,
    realized,
    gross: realized + openNotional * 0.002, // realized + notional at ~2bp risk
    openNotional,
  };
}

export interface EngineStat {
  engineId: string;
  label: string;
  signals: number;
  closed: number;
  wr: number; // win rate over closed+stopped
  avgEdge: number;
  realized: number;
}

export function engineStats(list: TradedSignal[]): EngineStat[] {
  return ENGINES.map((e) => {
    const rows = list.filter((s) => s.engineId === e.id);
    const done = rows.filter((s) => s.pnlUsd != null);
    const wins = done.filter((s) => (s.pnlUsd ?? 0) > 0).length;
    return {
      engineId: e.id,
      label: e.label,
      signals: rows.length,
      closed: done.length,
      wr: done.length ? Math.round((wins / done.length) * 100) : 0,
      avgEdge: rows.length ? Math.round(rows.reduce((a, s) => a + s.edgeBps, 0) / rows.length) : 0,
      realized: rows.reduce((a, s) => a + (s.pnlUsd ?? 0), 0),
    };
  }).sort((a, b) => b.realized - a.realized);
}

export function fmtHold(min: number): string {
  if (min < 1) return `${Math.max(0, Math.round(min * 60))}s`;
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
}
