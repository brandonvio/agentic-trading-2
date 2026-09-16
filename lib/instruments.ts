// v2 instrument universe — taxonomy, metadata, seed prices.
// Pure data. No RNG here. Session/quote rules live in lib/sessions.ts.

export type InstrumentType =
  | "crypto"
  | "equity"
  | "etf"
  | "future"
  | "treasury"
  | "fx"
  | "intl";

export type SessionClass = "crypto24" | "equityRTH" | "futures23" | "fx245";

export interface InstrumentMeta {
  symbol: string;
  name: string;
  type: InstrumentType;
  sessionClass: SessionClass;
  /** base decimals for the quote (futures points, FX 4-5 dpm, bonds 3/32 → 4 dp) */
  decimals: number;
  /** multiplier for futures/P&L per 1.0 move; 1 for cash */
  multiplier: number;
  /** min trade unit (contracts for futures, shares otherwise) */
  minQty: number;
  /** per-contract margin for futures, otherwise 0 (equity margin in money model) */
  marginPerUnit: number;
  /** typical half-spread in bps over mid */
  spreadBps: number;
  /** sensitivity to the shared equity shock (β); 0 if a haven */
  beta: number;
  /** safe-haven: positive = rises on a negative equity shock (risk-off) */
  haven: number;
  /** idiosyncratic vol per tick (fraction of price) */
  vol: number;
}

const M = (
  symbol: string,
  name: string,
  type: InstrumentType,
  sessionClass: SessionClass,
  decimals: number,
  marginPerUnit: number,
  spreadBps: number,
  beta: number,
  vol: number,
  haven = 0
): InstrumentMeta => ({
  symbol,
  name,
  type,
  sessionClass,
  decimals,
  multiplier: 1,
  minQty: type === "future" ? 1 : type === "fx" ? 10000 : 10,
  marginPerUnit,
  spreadBps,
  beta,
  haven,
  vol,
});

const F = (m: InstrumentMeta, multiplier: number, minQty = 1): InstrumentMeta => ({
  ...m,
  multiplier,
  minQty,
});

// ---------- seed universe ----------
export const UNIVERSE: InstrumentMeta[] = [
  // crypto (24/7)
  M("BTC-USD", "Bitcoin", "crypto", "crypto24", 2, 0, 5, 1.35, 0.0022),
  M("ETH-USD", "Ethereum", "crypto", "crypto24", 2, 0, 6, 1.5, 0.0028),
  // US equity / ETF (RTH)
  M("NVDA", "NVIDIA", "equity", "equityRTH", 2, 0, 0.6, 1.35, 0.0015),
  M("TSLA", "Tesla", "equity", "equityRTH", 2, 0, 1.2, 1.3, 0.0021),
  M("AAPL", "Apple", "equity", "equityRTH", 2, 0, 0.5, 0.8, 0.0009),
  M("MSFT", "Microsoft", "equity", "equityRTH", 2, 0, 0.5, 0.85, 0.0011),
  M("AMD", "AMD", "equity", "equityRTH", 2, 0, 1.1, 1.3, 0.0026),
  M("COIN", "Coinbase", "equity", "equityRTH", 2, 0, 1.4, 1.15, 0.0031),
  M("SPY", "SPDR S&P 500", "etf", "equityRTH", 2, 0, 0.3, 1.0, 0.0007),
  M("QQQ", "Invesco QQQ", "etf", "equityRTH", 2, 0, 0.4, 1.1, 0.0009),
  // treasuries (RTH, safe-haven complex)
  M("TLT", "iShares 20+Y T", "treasury", "equityRTH", 2, 0, 0.6, 0, 0.0008, 0.4),
  M("GLD", "SPDR Gold", "treasury", "equityRTH", 2, 0, 0.5, 0, 0.001, 0.3),
  // index / rates / commodity futures (23h Sun-Fri)
  F(M("ES", "S&P 500 E-mini", "future", "futures23", 2, 12850, 0.2, 1.0, 0.0009), 50),
  F(M("NQ", "Nasdaq 100 E-mini", "future", "futures23", 2, 8250, 0.3, 1.2, 0.0012), 20),
  F(M("ZB", "10y UST 100", "future", "futures23", 4, 1490, 0.4, 0, 0.0006, 0.35), 1000),
  F(M("ZN", "2y UST 100", "future", "futures23", 4, 1490, 0.4, 0, 0.0009, 0.4), 1000),
  F(M("ZF", "5y UST 100", "future", "futures23", 4, 1490, 0.4, 0, 0.0007, 0.3), 1000),
  F(M("CL", "WTI Crude", "future", "futures23", 2, 5850, 0.5, 0.3, 0.0016), 1000),
  F(M("GC", "Gold 100oz", "future", "futures23", 1, 10400, 0.3, 0, 0.001, 0.3), 100),
  // FX majors (24x5)
  M("EUR/USD", "Euro / US Dollar", "fx", "fx245", 5, 0, 0.4, 0, 0.0006),
  M("USD/JPY", "US Dollar / Yen", "fx", "fx245", 4, 0, 0.4, 0, 0.0005, 0.25),
  M("GBP/USD", "Pound / US Dollar", "fx", "fx245", 5, 0, 0.7, 0, 0.0008),
  M("AUD/USD", "Aussie / US Dollar", "fx", "fx245", 5, 0, 0.9, 0.35, 0.0009),
  M("USD/CAD", "Dollar / Loonie", "fx", "fx245", 5, 0, 0.5, 0, 0.0005),
  // international (local RTH, tracked as intl)
  M("7203.T", "Toyota (TYO)", "intl", "equityRTH", 2, 0, 1.0, 0.7, 0.0011),
  M("TOYOF", "Toyota ADR (US)", "intl", "equityRTH", 2, 0, 1.2, 0.7, 0.0013),
  M("ETRN", "SAP ADR (US)", "intl", "equityRTH", 2, 0, 1.0, 0.6, 0.0011),
  M("FXI", "iShares China Large", "intl", "equityRTH", 2, 0, 1.0, 0.4, 0.0014),
  M("EWJ", "iShares MSCI Japan", "intl", "equityRTH", 2, 0, 0.6, -0.2, 0.001),
  M("EEM", "iShares MSCI EM", "intl", "equityRTH", 2, 0, 0.8, 0.7, 0.0014),
];

/** base price per symbol (v1 symbols keep their original anchors) */
export const SEED_PRICES: Record<string, number> = {
  BTC: 67210.0,
  "BTC-USD": 67210.0,
  "ETH-USD": 3184.5,
  NVDA: 1184.2,
  TSLA: 246.8,
  AAPL: 228.4,
  MSFT: 452.1,
  AMD: 176.3,
  COIN: 291.7,
  SPY: 561.4,
  QQQ: 452.8,
  TLT: 91.2,
  GLD: 241.6,
  ES: 6112.4,
  NQ: 21349.5,
  ZB: 112 - 22 / 32, // 112-22
  ZN: 106 - 14 / 32,
  ZF: 108 - 4 / 32,
  CL: 72.46,
  GC: 2672.3,
  "EUR/USD": 1.0862,
  "USD/JPY": 149.82,
  "GBP/USD": 1.2731,
  "AUD/USD": 0.6523,
  "USD/CAD": 1.3518,
  "7203.T": 2430,
  TOYOF: 164.2,
  ETRN: 176.9,
  FXI: 37.42,
  EWJ: 48.16,
  EEM: 41.93,
};

export const typeLabel: Record<InstrumentType, string> = {
  crypto: "Crypto",
  equity: "Equity",
  etf: "ETF",
  future: "Future",
  treasury: "Treasury",
  fx: "FX",
  intl: "Intl",
};

export const metaBySymbol = new Map(UNIVERSE.map((m) => [m.symbol, m]));

export const meta = (symbol: string): InstrumentMeta =>
  metaBySymbol.get(symbol) ??
  M(symbol, symbol, "etf", "equityRTH", 2, 0, 0.8, 0.9, 0.001);

/** expected per-tick directional sign under a shared equity shock (deterministic) */
export const hedgeSign = (symbol: string, riskOff: boolean): number => {
  const m = meta(symbol);
  return riskOff ? (m.haven ? -1 : Math.sign(m.beta)) : Math.sign(m.beta);
};

export const isSafeHaven = (symbol: string) => meta(symbol).haven > 0;
