// lib/positions.ts — positions book: seed, tick, actions, attribution (pure).

import { nowTime, round, uid } from "./market";

export type PosSide = "LONG" | "SHORT";
export type PosAction = "close" | "half" | "stop";

export interface Position {
  id: string;
  symbol: string;
  side: PosSide;
  qty: number;
  entryPx: number;
  markPx: number;
  stopPx: number;
  targetPx: number;
  strategy: string;
  venue: string;
  openedAgoSec: number;
  marginUsed: number;
  leverage: number;
  unrealizedPnl: number;
  mfe: number;
  mae: number;
}

export interface ClosedTrade {
  id: string;
  tsLabel: string;
  symbol: string;
  side: PosSide;
  qty: number;
  px: number;
  pnl: number;
  strategy: string;
  venue: string;
  by: "ticker" | "desk";
}

export interface Book {
  positions: Position[];
  closes: ClosedTrade[];
}

export interface BookStats {
  equity: number;
  realizedTotal: number;
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  unrealized: number;
  marginUsed: number;
  marginPct: number;
  avgUnrealizedPct: number;
  worstPnl: number;
  worstSymbol: string;
  openCount: number;
}

export interface SymbolRow {
  symbol: string;
  pnl: number;
  exposure: number;
  side: PosSide | "MIXED";
}

const STRATS = [
  "Momentum v4",
  "Mean Revert ML",
  "Orderflow Imbalance",
  "Funding Capture",
  "Cross-Exchange Arb",
];

const VENUES = ["OKX·T0", "BINANCE·T1", "COINBASE·T2", "ALPACA·EQ1", "DESKEASE"];

const LEVS = [1, 1.5, 2, 2.5, 3] as const;

interface Specimen {
  symbol: string;
  basePx: number;
  crypto: boolean;
  qtyRange: [number, number];
}

const SPECIMENS: Specimen[] = [
  { symbol: "BTC-USD", basePx: 97_450, crypto: true, qtyRange: [0.15, 0.85] },
  { symbol: "ETH-USD", basePx: 3_412, crypto: true, qtyRange: [4, 42] },
  { symbol: "SOL-USD", basePx: 191.4, crypto: true, qtyRange: [40, 340] },
  { symbol: "TSLA", basePx: 342.1, crypto: false, qtyRange: [40, 380] },
  { symbol: "NVDA", basePx: 131.9, crypto: false, qtyRange: [120, 950] },
  { symbol: "AMD", basePx: 157.3, crypto: false, qtyRange: [80, 640] },
  { symbol: "COIN", basePx: 285.4, crypto: false, qtyRange: [25, 190] },
  { symbol: "ETH-USD", basePx: 3_410, crypto: true, qtyRange: [6, 30] },
  { symbol: "SOL-USD", basePx: 191.6, crypto: true, qtyRange: [60, 260] },
  { symbol: "TSLA", basePx: 341.8, crypto: false, qtyRange: [60, 300] },
];

const FEE_BPS = 2.5; // taker-ish half-spread on exits

function mk(s: Specimen, side: PosSide): Position {
  const [qMin, qMax] = s.qtyRange;
  const qty = s.crypto ? round(Math.min(qMax, Math.max(qMin, qMin + Math.random() * (qMax - qMin))), 2) : Math.round(qMin + Math.random() * (qMax - qMin));
  const dir = side === "LONG" ? 1 : -1;
  const drift = rand2(0.15, 2.3) / 100;
  const entryPx = round(s.basePx * (1 + (Math.random() < 0.5 ? -1 : 1) * drift), 2);
  const markPx = round(s.basePx * (1 + rand2(-0.08, 0.08) / 100), 2);
  const stopPx = round(entryPx * (1 - dir * rand2(0.8, 2.1) / 100), 2);
  const targetPx = round(entryPx * (1 + dir * rand2(1.6, 3.6) / 100), 2);
  const leverage = LEVS[Math.floor(Math.random() * LEVS.length)];
  const notional = markPx * qty;
  const marginUsed = round(notional / leverage, 0);
  const unrealizedPnl = round(dir * (markPx - entryPx) * qty, 2);
  const mfe = round(Math.max(0, unrealizedPnl) + rand2(0, 38), 2);
  const mae = round(Math.min(0, unrealizedPnl) - rand2(0, 38), 2);
  return {
    id: uid(),
    symbol: s.symbol,
    side,
    qty,
    entryPx,
    markPx,
    stopPx,
    targetPx,
    strategy: STRATS[Math.floor(Math.random() * STRATS.length)],
    venue: VENUES[Math.floor(Math.random() * VENUES.length)],
    openedAgoSec: Math.round(180 + Math.random() * 5_220),
    marginUsed,
    leverage,
    unrealizedPnl,
    mfe,
    mae,
  };
}

function rand2(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function seedPositions(): Book {
  const positions = SPECIMENS.map((s, i) => mk(s, i % 3 === 1 ? "SHORT" : "LONG"));
  return { positions, closes: [] };
}

function realize(p: Position, px: number, qtyClose: number, by: ClosedTrade["by"]): ClosedTrade {
  const dir = p.side === "LONG" ? 1 : -1;
  const gross = dir * (px - p.entryPx) * qtyClose;
  const fee = (px * qtyClose * FEE_BPS) / 10_000;
  return {
    id: uid(),
    tsLabel: nowTime(),
    symbol: p.symbol,
    side: p.side,
    qty: qtyClose,
    px,
    pnl: round(gross - fee, 2),
    strategy: p.strategy,
    venue: p.venue,
    by,
  };
}

export function tickPositions(book: Book): Book {
  let positions = book.positions.map((p) => {
    const shock = Math.random() < 0.05 ? rand2(-0.35, 0.35) / 100 : 0;
    const markPx = Math.max(0.01, round(p.markPx * (1 + rand2(-0.11, 0.11) / 100 + shock), 2));
    const dir = p.side === "LONG" ? 1 : -1;
    const unrealizedPnl = round(dir * (markPx - p.entryPx) * p.qty, 2);
    return {
      ...p,
      markPx,
      unrealizedPnl,
      mfe: Math.max(p.mfe, unrealizedPnl),
      mae: Math.min(p.mae, unrealizedPnl),
      openedAgoSec: p.openedAgoSec + 2,
    };
  });

  let closes = book.closes;
  if (positions.length > 4 && Math.random() < 0.055) {
    const idx = Math.floor(Math.random() * positions.length);
    const p = positions[idx];
    closes = [realize(p, p.markPx, p.qty, "ticker"), ...book.closes].slice(0, 30);
    positions = positions.filter((_, i) => i !== idx);
  }
  return { positions, closes };
}

export function actOnPosition(book: Book, id: string, action: PosAction): Book {
  const p = book.positions.find((x) => x.id === id);
  if (!p) return book;
  const px = action === "stop" ? p.stopPx : p.markPx;
  const qtyClose = action === "half" ? round(p.qty / 2, 4) : p.qty;
  const left = round(p.qty - qtyClose, 4);
  const closes = [realize(p, px, qtyClose, "desk"), ...book.closes].slice(0, 30);
  if (left <= 0) {
    return {
      positions: book.positions.filter((x) => x.id !== id),
      closes,
    };
  }
  const positions = book.positions.map((x) =>
    x.id === id
      ? { ...x, qty: left, marginUsed: round(x.marginUsed * (left / p.qty), 0) }
      : x
  );
  return { positions, closes };
}

export function closeAll(book: Book): Book {
  let closes = book.closes;
  for (const p of book.positions) {
    closes = [realize(p, p.markPx, p.qty, "desk"), ...closes].slice(0, 30);
  }
  return { positions: [], closes };
}

const BASE_REALIZED = 3_850;
const BASE_EQUITY = 1_000_000;

export function bookStats(book: Book): BookStats {
  const { positions, closes } = book;
  const realizedTotal =
    BASE_REALIZED + closes.reduce((a, c) => a + (c.by === "desk" || c.by === "ticker" ? c.pnl : 0), 0);
  const unrealized = positions.reduce((a, p) => a + p.unrealizedPnl, 0);
  let longExposure = 0;
  let shortExposure = 0;
  for (const p of positions) {
    const notional = p.markPx * p.qty;
    if (p.side === "LONG") longExposure += notional;
    else shortExposure += notional;
  }
  const marginUsed = positions.reduce((a, p) => a + p.marginUsed, 0);
  const equity = BASE_EQUITY + realizedTotal;
  const worst = positions.reduce(
    (acc, p) => (acc === null || p.unrealizedPnl < acc.pnl ? { pnl: p.unrealizedPnl, symbol: p.symbol } : acc),
    null as null | { pnl: number; symbol: string }
  );
  const pctVals = positions.map((p) => (p.unrealizedPnl / (p.entryPx * p.qty)) * 100);
  return {
    equity: round(equity, 0),
    realizedTotal: round(realizedTotal, 2),
    grossExposure: round(longExposure + shortExposure, 0),
    netExposure: round(longExposure - shortExposure, 0),
    longExposure: round(longExposure, 0),
    shortExposure: round(shortExposure, 0),
    unrealized: round(unrealized, 2),
    marginUsed: round(marginUsed, 0),
    marginPct: marginUsed ? round((marginUsed / equity) * 100, 1) : 0,
    avgUnrealizedPct: pctVals.length ? round(pctVals.reduce((a, b) => a + b, 0) / pctVals.length, 2) : 0,
    worstPnl: worst ? worst.pnl : 0,
    worstSymbol: worst ? worst.symbol : "—",
    openCount: positions.length,
  };
}

export function bySymbol(book: Book): SymbolRow[] {
  const map = new Map<string, { pnl: number; exposure: number; long: number; short: number }>();
  for (const p of book.positions) {
    const row = map.get(p.symbol) ?? { pnl: 0, exposure: 0, long: 0, short: 0 };
    row.pnl += p.unrealizedPnl;
    row.exposure += p.markPx * p.qty;
    if (p.side === "LONG") row.long += p.markPx * p.qty;
    else row.short += p.markPx * p.qty;
    map.set(p.symbol, row);
  }
  return [...map.entries()]
    .map(([symbol, r]) => ({
      symbol,
      pnl: round(r.pnl, 2),
      exposure: round(r.exposure, 0),
      side: (r.long === r.short ? "MIXED" : r.long > r.short ? "LONG" : "SHORT") as SymbolRow["side"],
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 8);
}

// ---------- formatting ----------

export function fmtPx(px: number): string {
  if (px >= 1_000_000) return (px / 1_000_000).toFixed(2) + "M";
  if (px >= 10_000) return Math.round(px).toLocaleString("en-US");
  if (px >= 1_000) return round(px, 1) + "";
  return px.toFixed(2);
}

export function fmtQty(qty: number): string {
  if (qty >= 10_000) return Math.round(qty).toLocaleString("en-US");
  if (qty >= 100) return Math.round(qty).toString();
  return qty.toFixed(2).replace(/\.?0+$/, "") || "0";
}

export function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3_600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3_600)}h`;
}
