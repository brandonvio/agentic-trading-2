// Brokers v2: unified venues + capability matrix. Pure, deterministic.

import { UNIVERSE, type InstrumentType } from "./instruments";

export type BrokerType = "unified" | "crypto";
export type BrokerStatus = "online" | "degraded" | "maintenance";

export interface Broker {
  id: string;
  name: string;
  short: string;
  type: BrokerType;
  capabilities: InstrumentType[];
  region: string;
  feeBps: number;
  marginRate: number; // annual debit interest
  p50ms: number;
  p99ms: number;
  status: BrokerStatus;
  flex: boolean; // FLEX-style daily reconciliation
  cashUsd: number;
  creditLimitUsd: number;
  note: string;
}

export const ASSET_TYPES: InstrumentType[] = ["equity", "etf", "future", "treasury", "fx", "intl", "crypto"];

export const BROKERS: Broker[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers",
    short: "IBKR",
    type: "unified",
    capabilities: ["equity", "etf", "future", "treasury", "fx", "intl"],
    region: "Global · NY4",
    feeBps: 1.2,
    marginRate: 0.0985,
    p50ms: 24,
    p99ms: 88,
    status: "online",
    flex: true,
    cashUsd: 412_000,
    creditLimitUsd: 600_000,
    note: "Prime margin · FLEX daily · every non-crypto instrument",
  },
  {
    id: "okx",
    name: "OKX",
    short: "OKX",
    type: "crypto",
    capabilities: ["crypto"],
    region: "SG · APAC",
    feeBps: 6,
    marginRate: 0.11,
    p50ms: 29,
    p99ms: 141,
    status: "online",
    flex: false,
    cashUsd: 64_020,
    creditLimitUsd: 90_000,
    note: "T0 crypto · deepest BTC/ETH book in this house",
  },
  {
    id: "bybit",
    name: "Bybit",
    short: "BYB",
    type: "crypto",
    capabilities: ["crypto"],
    region: "SG · APAC",
    feeBps: 5,
    marginRate: 0.11,
    p50ms: 22,
    p99ms: 96,
    status: "online",
    flex: false,
    cashUsd: 21_800,
    creditLimitUsd: 40_000,
    note: "ETH options + futures · fastest p50 in the set",
  },
  {
    id: "bitget",
    name: "Bitget",
    short: "BGET",
    type: "crypto",
    capabilities: ["crypto"],
    region: "EU · LDN",
    feeBps: 8,
    marginRate: 0.11,
    p50ms: 37,
    p99ms: 171,
    status: "degraded",
    flex: false,
    cashUsd: 9_400,
    creditLimitUsd: 20_000,
    note: "Alt flow · currently degraded, routing down-weighted",
  },
];

/** capability matrix: venue × asset class */
export function capabilityMatrix(): { broker: Broker; type: InstrumentType; ok: boolean }[] {
  const rows: { broker: Broker; type: InstrumentType; ok: boolean }[] = [];
  for (const b of BROKERS)
    for (const t of ASSET_TYPES) rows.push({ broker: b, type: t, ok: b.capabilities.includes(t) });
  return rows;
}

/** all brokers that can trade the type, healthy first */
export function venuesFor(type: InstrumentType): Broker[] {
  const ok = BROKERS.filter((b) => b.capabilities.includes(type) && b.status === "online");
  const rest = BROKERS.filter((b) => b.capabilities.includes(type) && b.status !== "online");
  return [...ok, ...rest];
}

/** OMS routing: best available venue for an asset class */
export function bestVenue(type: InstrumentType): Broker | null {
  const list = venuesFor(type);
  if (!list.length) return null;
  return list.sort((a, b) => a.p99ms - b.p99ms)[0] ?? null;
}

/** acceptance: every instrument in the universe routes to ≥1 venue */
export function coverage(): { symbol: string; type: InstrumentType; venues: number }[] {
  return UNIVERSE.map((m) => ({ symbol: m.symbol, type: m.type, venues: venuesFor(m.type).length }));
}
