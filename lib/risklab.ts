// lib/risklab.ts — scenario risk engine, pure + deterministic given inputs.

export interface RiskLimit {
  name: string;
  used: number;
  limit: number;
  unit: string;
  pct: number; // used/limit*100 clamped 0-200
}

export interface VaCvar {
  var95_1d: number;
  var99_1d: number;
  var95_10d: number;
  cvar95_1d: number;
}

export interface Scenario {
  id: string;
  name: string;
  severity: 1 | 2 | 3 | 4;
  pnlDeltaUsd: number;
  varImpact: number; // additive $ to 1d VaR
  breachBoost: Record<string, number>; // limit name -> pct points added when applied
}

export interface StressedLimit extends RiskLimit {
  stressedPct: number;
  breached: boolean;
  delta: number; // pct points added
}

export function baseLimits(): RiskLimit[] {
  const rows: [string, number, number, string][] = [
    ["Gross exposure", 68, 100, "%"],
    ["Net delta", 42, 80, "%"],
    ["Vega notional", 55_000, 90_000, "k$"],
    ["Per-symbol cap", 74, 90, "%"],
    ["Margin usage", 58, 85, "%"],
    ["Order rate (5m)", 31, 40, "ord"],
  ];
  return rows.map(([name, used, limit, unit]) => ({
    name,
    used,
    limit,
    unit,
    pct: Math.min(200, (used / limit) * 100),
  }));
}

/** deterministic pseudo-normal sample (Box–Muller over mulberry32) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededReturns(seed = 20250621, n = 512): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(1e-9, rng());
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    // slight negative skew, 1.35% daily vol, in bps
    out.push(+(z * 13.5 - Math.abs(z) * 2.1).toFixed(3));
  }
  return out;
}

function quantile(sortedAsc: number[], q: number): number {
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(q * sortedAsc.length)));
  return sortedAsc[idx];
}

export function computeVaCvar(returnsBps: number[], equityUsd = 1_120_000): VaCvar {
  const sorted = [...returnsBps].sort((a, b) => a - b);
  const var95 = quantile(sorted, 0.05); // negative bps
  const var99 = quantile(sorted, 0.01);
  const tail = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)));
  const cvar95 = tail.reduce((a, b) => a + b, 0) / tail.length;
  const toUsd = (bps: number) => (Math.abs(bps) / 10_000) * equityUsd;
  return {
    var95_1d: Math.round(toUsd(var95)),
    var99_1d: Math.round(toUsd(var99)),
    var95_10d: Math.round(toUsd(var95) * Math.sqrt(10)),
    cvar95_1d: Math.round(toUsd(cvar95)),
  };
}

export function scenarios(): Scenario[] {
  return [
    {
      id: "vol-spike",
      name: "Vol spike +2σ",
      severity: 2,
      pnlDeltaUsd: -86_000,
      varImpact: 95_000,
      breachBoost: { "Vega notional": 18, "Margin usage": 12, "Gross exposure": 8 },
    },
    {
      id: "gap-down",
      name: "Gap down −6%",
      severity: 3,
      pnlDeltaUsd: -238_000,
      varImpact: 310_000,
      breachBoost: { "Gross exposure": 24, "Net delta": 31, "Per-symbol cap": 27, "Margin usage": 16 },
    },
    {
      id: "correlation",
      name: "Correlation blow-up",
      severity: 3,
      pnlDeltaUsd: -154_000,
      varImpact: 180_000,
      breachBoost: { "Gross exposure": 14, "Net delta": 22, "Vega notional": 20 },
    },
    {
      id: "liquidity",
      name: "Liquidity loss",
      severity: 2,
      pnlDeltaUsd: -42_000,
      varImpact: 60_000,
      breachBoost: { "Order rate (5m)": 15, "Margin usage": 6, "Gross exposure": 4 },
    },
    {
      id: "outage",
      name: "Exchange outage",
      severity: 4,
      pnlDeltaUsd: -121_000,
      varImpact: 240_000,
      breachBoost: { "Order rate (5m)": 28, "Per-symbol cap": 12, "Margin usage": 9 },
    },
    {
      id: "drift",
      name: "Model drift",
      severity: 1,
      pnlDeltaUsd: -18_000,
      varImpact: 25_000,
      breachBoost: { "Order rate (5m)": 8, "Vega notional": 5, "Gross exposure": 3 },
    },
  ];
}

export function applyScenario(limits: RiskLimit[], scen: Scenario): StressedLimit[] {
  return limits.map((l) => {
    const delta = scen.breachBoost[l.name] ?? 0;
    const stressedPct = Math.min(200, l.pct + delta);
    return { ...l, stressedPct, delta, breached: stressedPct >= 100 };
  });
}

// heatmap: impact band 0-4 per (scenario, dimension)
export const DIMENSIONS = ["PnL", "VaR", "Exposure", "Liquidity", "Ops"] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export function stressMatrix(scens: Scenario[]): { id: string; dims: number[] }[] {
  const base: Record<string, [number, number, number, number, number]> = {
    "vol-spike": [2, 3, 3, 1, 1],
    "gap-down": [4, 4, 4, 2, 1],
    correlation: [3, 4, 4, 1, 1],
    liquidity: [2, 2, 1, 4, 1],
    outage: [3, 3, 2, 3, 4],
    drift: [1, 2, 1, 1, 2],
  };
  return scens.map((s) => ({ id: s.id, dims: base[s.id] ?? [1, 1, 1, 1, 1] }));
}

export function bandColor(band: number): string {
  // 0 low .. 4 high
  if (band >= 4) return "bg-short/75 text-white";
  if (band === 3) return "bg-short/45 text-white";
  if (band === 2) return "bg-amber/45 text-slate-950";
  if (band === 1) return "bg-amber/20 text-slate-900";
  return "bg-long/25 text-slate-900";
}

export function bandLabel(band: number): string {
  return ["LOW", "WATCH", "ELEVATED", "SEVERE", "CRITICAL"][band] ?? "LOW";
}
