// Model registry: champion/challenger per universe, computed drift, P&L attribution.
// registry ops (promote/pause/resume) are pure functions.

import { MODELS, type Features } from "./brain";

export type ModelStatus = "live" | "challenger" | "paused";

export interface ModelRecord {
  id: string;
  name: string;
  version: string;
  universe: string;
  championsFor: string[]; // e.g. ["equity-mom"]  (universe slots)
  status: ModelStatus;
  sharpe: number;
  ddPct: number; // max drawdown %
  winRate: number; // 0-1
  drift: number; // 0-1, computed
  pnlUsd: number;
  samples: number;
  since: string;
  killReason?: string; // set when status = paused
}

const SEED_RECORDS: Omit<ModelRecord, "drift">[] = [
  { id: "mom-4.2", name: "Momentum", version: "v4.2", universe: "equity · etf · intl", championsFor: ["equity-trend"], status: "live", sharpe: 1.62, ddPct: 2.4, winRate: 0.581, pnlUsd: 48240, samples: 1832, since: "2024-03-11" },
  { id: "flow-imb", name: "Orderflow Imb", version: "v2.7", universe: "equity · etf · crypto", championsFor: [], status: "paused", sharpe: 1.21, ddPct: 3.9, winRate: 0.537, pnlUsd: 21410, samples: 946, since: "2025-01-19", killReason: "drift 0.84 ≥ 0.80 · 14:02Z funding-regime shift — re-gate backtest required" },
  { id: "fund-capt", name: "Funding Capture", version: "v3.1", universe: "crypto", championsFor: ["crypto-funding"], status: "live", sharpe: 1.44, ddPct: 4.8, winRate: 0.552, pnlUsd: 33180, samples: 2210, since: "2024-08-02" },
  { id: "mr-ml", name: "Mean Revert (ML)", version: "v1.9", universe: "etf · equity · treasury", championsFor: ["etf-revert"], status: "live", sharpe: 1.05, ddPct: 3.1, winRate: 0.493, pnlUsd: 14760, samples: 1204, since: "2024-11-30" },
  { id: "volarb-2", name: "Vol Arb", version: "v2.0", universe: "equity · fx · future", championsFor: [], status: "challenger", sharpe: 0.87, ddPct: 5.2, winRate: 0.468, pnlUsd: 9020, samples: 611, since: "2025-04-27" },
  { id: "xvenue-arb", name: "Cross-Venue Arb", version: "v1.4", universe: "crypto", championsFor: ["crypto-xv"], status: "live", sharpe: 1.90, ddPct: 1.2, winRate: 0.640, pnlUsd: 27930, samples: 3488, since: "2024-06-21" },
];

export interface DriftInput {
  recent: Features[];
  baseline: Features[];
}

/** drift = normalized mean absolute feature change between recent and baseline windows */
export function driftOf(input: DriftInput): number {
  const n = Math.min(input.recent.length, input.baseline.length);
  if (!n) return 0;
  const keys = Object.keys(input.baseline[0]) as (keyof Features)[];
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (const k of keys) {
      const spread = 2; // typical feature range
      total += Math.abs(input.recent[i][k] - input.baseline[i][k]) / spread;
    }
  }
  const perSample = total / (n * keys.length);
  return Math.round(Math.min(1, perSample / 0.25) * 1000) / 1000;
}

/** attribute realized P&L to the model that fired the entry */
export function attributePnl(reg: ModelRecord[], fills: { modelId: string; pnlUsd: number }[]): ModelRecord[] {
  const byId = new Map(reg.map((r) => [r.id, r]));
  for (const f of fills) {
    const r = byId.get(f.modelId);
    if (r) r.pnlUsd += f.pnlUsd;
  }
  return reg;
}

/** challenger → champion: wins the slot; incumbent drops to challenger */
export function promote(reg: ModelRecord[], id: string, slot: string): ModelRecord[] {
  return reg.map((r) => {
    if (r.id === id) {
      return { ...r, status: "live" as const, championsFor: [...new Set([...r.championsFor, slot])] };
    }
    if (r.championsFor.includes(slot)) {
      return {
        ...r,
        status: r.championsFor.length > 1 ? r.status : ("challenger" as const),
        championsFor: r.championsFor.filter((s) => s !== slot),
      };
    }
    return r;
  });
}

/** kill switch: drift above threshold auto-pauses, losing all slots */
export function pauseForDrift(reg: ModelRecord[], threshold = 0.8): ModelRecord[] {
  return reg.map((r) =>
    r.drift >= threshold && r.status !== "paused"
      ? { ...r, status: "paused" as const, championsFor: [], killReason: `drift ${r.drift.toFixed(2)} ≥ ${threshold} — re-gate backtest required` }
      : r,
  );
}

export function resume(reg: ModelRecord[], id: string): ModelRecord[] {
  return reg.map((r) => (r.id === id ? { ...r, status: "challenger" as const } : r));
}

function det(n: string, lo: number, hi: number): number {
  let x = 2166136261;
  for (let i = 0; i < n.length; i++) {
    x ^= n.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return lo + ((x >>> 0) % 997) / 997 * (hi - lo);
}

export function seedRegistry(): ModelRecord[] {
  return SEED_RECORDS.map((r) => ({
    ...r,
    drift: Number(det(`drift:${r.id}:${r.version}`, 0.08, 0.95).toFixed(3)),
  }));
}

export function modelCount(): number {
  return MODELS.length;
}

/** seed P&L fills for attribution demo — deterministic */
export function seedFills(): { modelId: string; pnlUsd: number }[] {
  return [
    { modelId: "mom-4.2", pnlUsd: 12840 },
    { modelId: "mom-4.2", pnlUsd: -2210 },
    { modelId: "fund-capt", pnlUsd: 8930 },
    { modelId: "xvenue-arb", pnlUsd: 15120 },
    { modelId: "xvenue-arb", pnlUsd: -1870 },
    { modelId: "mr-ml", pnlUsd: 4160 },
    { modelId: "flow-imb", pnlUsd: 6720 },
    { modelId: "flow-imb", pnlUsd: -980 },
    { modelId: "volarb-2", pnlUsd: 2450 },
  ];
}
