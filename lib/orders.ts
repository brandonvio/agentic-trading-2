import { nowTime, pick, rand, uid } from "./market";

// ---------- types ----------

export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "STOP" | "MARKET";
export type Tif = "GTC" | "IOC" | "FOK";
export type OrderStatus = "OPEN" | "PARTIAL" | "FILLED" | "CANCELED" | "EXPIRED";

export interface Order {
  id: string;
  ref: string; // "NX-4821"
  symbol: string;
  side: OrderSide;
  type: OrderType;
  tif: Tif;
  status: OrderStatus;
  qty: number;
  filledQty: number;
  avgPx: number; // vwap of fills so far (0 if none)
  limitPx: number | null;
  stopPx: number | null;
  venue: string;
  strategy: string;
  ageSec: number;
  riskUsd: number; // stop distance × qty
  reduceOnly: boolean;
}

export interface Fill {
  id: string;
  ref: string | null;
  symbol: string;
  side: OrderSide;
  px: number;
  qty: number;
  fee: number;
  slippageBps: number;
  role: "MAKER" | "TAKER";
  venue: string;
  time: string;
}

export interface BookStats {
  open: number;
  partial: number;
  openNotional: number;
  filled: number;
  cancelled: number;
  expired: number;
  fillRatio: number; // filled qty / total qty (0-100)
  slippageBps: number; // avg
  fees: number;
  openRisk: number; // Σ stop risk of open orders
  avgAgeSec: number;
}

export interface VenueRow {
  venue: string;
  orders: number;
  fillRatio: number;
  slippageBps: number;
  fees: number;
}

// ---------- universe ----------

const SYMBOLS = [
  { sym: "ETH-USD", px: 3421.5, qty: [0.25, 6.5], crypto: true },
  { sym: "SOL-USD", px: 188.42, qty: [20, 900], crypto: true },
  { sym: "BTC-USD", px: 97412, qty: [0.02, 0.4], crypto: true },
  { sym: "TSLA", px: 254.1, qty: [12, 320], crypto: false },
  { sym: "NVDA", px: 133.9, qty: [20, 400], crypto: false },
  { sym: "AMD", px: 168.7, qty: [15, 350], crypto: false },
];

const VENUES = ["OKX · T0", "BINANCE · T1", "COINBASE · T2", "ALPACA · EQ1", "ARBITRAGE"];

const STRATEGIES = [
  "Orderflow Imbalance",
  "Momentum v4",
  "Mean Revert ML",
  "Funding Capture",
  "Cross-Exchange Arb",
];

let refCounter = 4821;
const nextRef = () => `NX-${(refCounter += 7 + Math.floor(Math.random() * 9))}`;

const r2 = (n: number) => Math.round(n * 100) / 100;

export const fmtQty = (crypto: boolean, q: number) =>
  crypto ? q.toLocaleString(undefined, { maximumFractionDigits: 2 }) : Math.round(q).toLocaleString();

export const fmtPx = (n: number) =>
  n >= 1000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : n.toFixed(2);

export const isCrypto = (symbol: string) => symbol.endsWith("-USD");

export const fmtAge = (sec: number) => {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
};

// ---------- builders ----------

function makeOrder(preset?: Partial<Order>): Order {
  const s = pick(SYMBOLS);
  const side: OrderSide = Math.random() < 0.52 ? "BUY" : "SELL";
  const type: OrderType = Math.random() < 0.68 ? "LIMIT" : Math.random() < 0.5 ? "STOP" : "MARKET";
  const qty = r2(rand(s.qty[0], s.qty[1]));
  const base = s.px * (1 + rand(-0.0016, 0.0016));
  const limitOff = rand(0.0004, 0.0014);
  const stopOff = rand(0.006, 0.018);
  const dir = side === "BUY" ? 1 : -1;
  const limitPx = type === "LIMIT" ? base * (1 + dir * limitOff) : null;
  const stopPx = type === "STOP" ? base * (1 - dir * stopOff) : limitPx ? base * (1 - dir * stopOff) : null;
  const anchor = limitPx ?? stopPx ?? base;
  return {
    id: uid(),
    ref: nextRef(),
    symbol: s.sym,
    side,
    type,
    tif: pick<Tif>(["GTC", "GTC", "GTC", "IOC", "FOK"]),
    status: "OPEN",
    qty,
    filledQty: 0,
    avgPx: 0,
    limitPx: limitPx ? r2(limitPx) : null,
    stopPx: stopPx ? r2(stopPx) : null,
    venue: pick(VENUES),
    strategy: pick(STRATEGIES),
    ageSec: Math.round(rand(4, 300)),
    riskUsd: Math.round(qty * anchor * stopOff * (type === "LIMIT" ? 1 : 1)),
    reduceOnly: Math.random() < 0.3,
    ...preset,
  };
}

export function newOrder(): Order {
  return makeOrder();
}

export function seedOrders(): { orders: Order[]; fills: Fill[] } {
  const statuses: [OrderStatus, number][] = [
    ["FILLED", 3],
    ["PARTIAL", 2],
    ["OPEN", 4],
    ["CANCELED", 1],
  ];
  const orders: Order[] = [];
  const fills: Fill[] = [];
  for (const [st, n] of statuses) {
    for (let i = 0; i < n; i++) {
      const o = makeOrder({ status: st });
      if (st === "FILLED" || st === "PARTIAL") {
        const ratio = st === "FILLED" ? 1 : rand(0.2, 0.7);
        const px = (o.limitPx ?? o.stopPx ?? 1) * (1 + rand(-0.0006, 0.0006));
        o.filledQty = r2(o.qty * ratio);
        o.avgPx = r2(px);
        if (o.filledQty > 0) {
          fills.push(
            makeFill(o, o.filledQty, o.avgPx, Math.random() < 0.5 ? "MAKER" : "TAKER")
          );
        }
      }
      orders.push(o);
    }
  }
  orders.sort((a, b) => b.ageSec - a.ageSec);
  return { orders, fills };
}

function makeFill(
  o: Order,
  qty: number,
  px: number,
  role: "MAKER" | "TAKER"
): Fill {
  const slippageBps = Math.round((role === "TAKER" ? rand(1.2, 8.5) : rand(0, 1.8)) * 10) / 10;
  return {
    id: uid(),
    ref: o.ref,
    symbol: o.symbol,
    side: o.side,
    px: r2(px),
    qty,
    fee: r2(px * qty * 0.0008),
    slippageBps,
    role,
    venue: o.venue,
    time: nowTime(),
  };
}

// ---------- actions ----------

export type OrderAction = "cancel" | "execute" | "reduce";

export function actOnOrder(
  orders: Order[],
  fills: Fill[],
  id: string,
  action: OrderAction
): { orders: Order[]; fills: Fill[] } {
  let nextFills = fills;
  const nextOrders = orders.map((o) => {
    if (o.id !== id) return o;
    const openQty = o.qty - o.filledQty;
    if (action === "cancel") {
      return { ...o, status: "CANCELED" as const };
    }
    const fillRatio = action === "execute" ? 1 : 0.5;
    const chunk = openQty * fillRatio;
    const px = ((o.limitPx ?? o.stopPx ?? o.avgPx) || 1) * (1 + rand(-0.0008, 0.0009));
    const nf = makeFill(o, r2(chunk), r2(px), "TAKER");
    nextFills = [nf, ...nextFills];
    const newFilled = r2(o.filledQty + chunk);
    const newAvg = o.filledQty > 0 ? (o.avgPx * o.filledQty + px * chunk) / (newFilled) : px;
    return {
      ...o,
      filledQty: newFilled,
      avgPx: r2(newAvg),
      status: newFilled >= o.qty - 1e-9 ? ("FILLED" as const) : ("PARTIAL" as const),
    };
  });
  return { orders: nextOrders, fills: nextFills.slice(0, 40) };
}

// ---------- live tick ----------

export function tickBook(orders: Order[], fills: Fill[]): { orders: Order[]; fills: Fill[] } {
  let nextFills = fills;
  let advancedId: string | null = null;
  let cancelledId: string | null = null;
  let expiredId: string | null = null;

  const active = orders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIAL"
  );

  // at most one order advances per tick
  if (active.length && Math.random() < 0.55) {
    const pick_ = active[Math.floor(Math.random() * active.length)];
    advancedId = pick_.id;
    // roll for cancel / expire (small, independent odds)
    const roll = Math.random();
    if (roll < 0.04) cancelledId = pick_.id;
    else if (roll < 0.07 && pick_.tif !== "GTC" && pick_.status === "OPEN")
      expiredId = pick_.id;
  }

  const orders2 = orders.map((o) => {
    const aged = { ...o, ageSec: o.ageSec + 2.4 };
    if (o.id === cancelledId) return { ...aged, status: "CANCELED" as const };
    if (o.id === expiredId) return { ...aged, status: "EXPIRED" as const };
    if (o.id !== advancedId) return aged;
    const openQty = aged.qty - aged.filledQty;
    if (openQty <= 0) return aged;
    const lastChunk = Math.random() < 0.35;
    const chunk = r2(openQty * (lastChunk ? 1 : rand(0.1, 0.5)));
    const px = ((aged.limitPx ?? aged.stopPx ?? aged.avgPx) || 1) * (1 + rand(-0.0007, 0.0007));
    const nf = makeFill(aged, chunk, r2(px), Math.random() < 0.55 ? "MAKER" : "TAKER");
    nextFills = [nf, ...nextFills];
    const newFilled = r2(aged.filledQty + chunk);
    const newAvg =
      aged.filledQty > 0
        ? (aged.avgPx * aged.filledQty + px * chunk) / newFilled
        : px;
    return {
      ...aged,
      filledQty: newFilled,
      avgPx: r2(newAvg),
      status: newFilled >= aged.qty - 1e-9 ? ("FILLED" as const) : ("PARTIAL" as const),
    };
  });

  let out = orders2;
  if (
    Math.random() < 0.28 &&
    out.filter((o) => o.status === "OPEN" || o.status === "PARTIAL").length < 13
  ) {
    out = [makeOrder(), ...out];
  }
  return { orders: out.slice(0, 20), fills: nextFills.slice(0, 40) };
}

// ---------- stats ----------

export function bookStats(orders: Order[], fills: Fill[]): BookStats {
  const active = orders.filter((o) => o.status === "OPEN" || o.status === "PARTIAL");
  const openNotional = active.reduce((a, o) => {
    const px = (o.limitPx ?? o.stopPx ?? o.avgPx) || 0;
    return a + (o.qty - o.filledQty) * px;
  }, 0);
  const totalQty = orders.reduce((a, o) => a + o.qty, 0);
  const filledQty = orders.reduce((a, o) => a + o.filledQty, 0);
  const fees = fills.reduce((a, f) => a + f.fee, 0);
  const slip = fills.length
    ? fills.reduce((a, f) => a + f.slippageBps, 0) / fills.length
    : 0;
  const age = active.length
    ? active.reduce((a, o) => a + o.ageSec, 0) / active.length
    : 0;
  return {
    open: orders.filter((o) => o.status === "OPEN").length,
    partial: orders.filter((o) => o.status === "PARTIAL").length,
    openNotional: Math.round(openNotional),
    filled: orders.filter((o) => o.status === "FILLED").length,
    cancelled: orders.filter((o) => o.status === "CANCELED").length,
    expired: orders.filter((o) => o.status === "EXPIRED").length,
    fillRatio: totalQty ? Math.round((filledQty / totalQty) * 100) : 0,
    slippageBps: Math.round(slip * 10) / 10,
    fees: Math.round(fees),
    openRisk: active.reduce((a, o) => a + o.riskUsd, 0),
    avgAgeSec: Math.round(age),
  };
}

export function venueRows(orders: Order[], fills: Fill[]): VenueRow[] {
  const venues = Array.from(new Set(orders.map((o) => o.venue)));
  return venues.map((v) => {
    const vs = orders.filter((o) => o.venue === v);
    const vf = fills.filter((f) => f.venue === v);
    const tq = vs.reduce((a, o) => a + o.qty, 0);
    const fq = vs.reduce((a, o) => a + o.filledQty, 0);
    return {
      venue: v,
      orders: vs.length,
      fillRatio: tq ? Math.round((fq / tq) * 100) : 0,
      slippageBps: vf.length ? Math.round((vf.reduce((a, f) => a + f.slippageBps, 0) / vf.length) * 10) / 10 : 0,
      fees: Math.round(vf.reduce((a, f) => a + f.fee, 0)),
    };
  }).sort((a, b) => b.orders - a.orders);
}

export function riskRows(orders: Order[]) {
  const active = orders.filter((o) => o.status === "OPEN" || o.status === "PARTIAL");
  const map = new Map<string, { risk: number; notional: number }>();
  for (const o of active) {
    const px = (o.limitPx ?? o.stopPx ?? o.avgPx) || 0;
    const cur = map.get(o.symbol) ?? { risk: 0, notional: 0 };
    map.set(o.symbol, { risk: cur.risk + o.riskUsd, notional: cur.notional + (o.qty - o.filledQty) * px });
  }
  const rows = Array.from(map.entries()).map(([symbol, v]) => ({
    symbol,
    risk: Math.round(v.risk),
    notional: Math.round(v.notional),
  }));
  rows.sort((a, b) => b.risk - a.risk);
  return rows.slice(0, 8);
}
