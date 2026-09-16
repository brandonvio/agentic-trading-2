// Futures: contract ladders, rolls, spreads, contract economics.

import { meta, SEED_PRICES } from "./instruments";

export interface ContractSpec {
  symbol: string;
  name: string;
  multiplier: number;
  tickValue: number;
  margin: number;
  baseOI: number;
  /** sign: contango +, backwardation − · magnitude per month of carry (fraction) */
  carry: number;
}

const spec = (s: string, mult: number, tick: number, margin: number, oi: number, carry: number): ContractSpec => {
  const m = meta(s);
  return { symbol: s, name: m.name, multiplier: mult, tickValue: tick, margin, baseOI: oi, carry };
};

export const CONTRACTS: ContractSpec[] = [
  spec("ES", 50, 12.5, 5145, 2_420_000, 0.0016),
  spec("NQ", 20, 5, 21_450, 486_000, 0.0022),
  spec("ZB", 1000, 31.25, 2_975, 638_000, 0.0011),
  spec("GC", 100, 10, 13_600, 318_000, -0.0008),
  spec("CL", 1000, 10, 5_535, 192_000, -0.0038),
  spec("ZL", 10000, 500, 2_475, 541_000, 0.0009),
];

export interface LadderRow {
  m: 0 | 1 | 2 | 3;
  label: string;
  px: number;
  oi: number;
  prompt: boolean;
}

const monthLabel = (i: number, now: number) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() + i);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear() % 100).padStart(2, "0")}`;
};

/** price ladder: prompt + 3 followings (carry chain), OI decay */
export function ladderFor(symbol: string, now: number): LadderRow[] {
  const c = CONTRACTS.find((x) => x.symbol === symbol);
  if (!c) return [];
  const spot = SEED_PRICES[symbol] ?? 100;
  const dec = meta(symbol)?.decimals ?? 2;
  const out: LadderRow[] = [];
  for (let i = 0; i < 4; i++) {
    out.push({
      m: i as 0 | 1 | 2 | 3,
      label: monthLabel(i, now),
      px: Number((spot * (1 + c.carry * i)).toFixed(Math.max(dec, 2))),
      oi: Math.round(c.baseOI * Math.pow(0.56, i)),
      prompt: i === 0,
    });
  }
  return out;
}

export const ladders = (now: number) =>
  CONTRACTS.map((c) => ({ ...c, rows: ladderFor(c.symbol, now) }));

export interface RollInfo {
  frontMonthEnds: string;
  windowDays: [number, number];
  nextRollLabel: string;
  daysToWindow: number;
  inWindow: boolean;
}

/** roll window = the week of the second Friday; next roll date computed on the calendar */
export function rollInfo(now: number): RollInfo {
  const d = new Date(now);
  const day = d.getUTCDate();
  const inWindow = day >= 8 && day <= 19;
  // days until window start of this month, else next month
  let days = 8 - day;
  if (days <= 0) {
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 8));
    days = Math.ceil((next.getTime() - d.getTime()) / 86400000);
  }
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = MONTHS[d.getUTCMonth()].slice(0, 3);
  return {
    frontMonthEnds: day >= 18 ? `${mLabel} ${d.getUTCDate()}` : `${mLabel} (this month)`,
    windowDays: [8, 19],
    nextRollLabel: `${mLabel} 8–19`,
    daysToWindow: Math.max(days, 0),
    inWindow,
  };
}

export interface SpreadRow {
  symbol: string;
  front: number;
  second: number;
  diffPts: number;
  diffDollars: number;
  kind: "contango" | "backwardation";
}

export function spreads(now: number): SpreadRow[] {
  return ladders(now).map(({ symbol, multiplier, rows }) => {
    const diff = rows[1].px - rows[0].px;
    return {
      symbol,
      front: rows[0].px,
      second: rows[1].px,
      diffPts: Number(diff.toFixed(4)),
      diffDollars: Math.round(diff * multiplier),
      kind: diff < 0 ? "backwardation" : "contango",
    };
  });
}

/** venue capability note (IB = simulated) */
export const VENUES = [
  { name: "CME (via IB · simulated)", available: true, note: "direct matching, real queue" },
  { name: "IB smart-routed", available: true, note: "best-net-price across CME/OTC" },
  { name: "OTC broker", available: false, note: "RFQ only, wide marks" },
];
