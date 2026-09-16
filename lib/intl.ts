// International: ADR/local split, FX-hedge costs, EM ETFs.

import { SEED_PRICES } from "./instruments";
import type { Pair } from "./fx";

export interface Split {
  adr: string;
  adrName: string;
  local: string | null;
  localName: string | null;
  ccy: string;
  fxPair: Pair;
  /** ADR discount to local × FX, % (negative = ADR cheap) */
  discountPct: number;
  hedgedCostPct: number; // annual cost of FX-hedged ADR vs unhedged
  note: string;
}

export const SPLITS: Split[] = [
  {
    adr: "TOYOF",
    adrName: "Toyota ADR (US)",
    local: "7203.T",
    localName: "Toyota (TYO)",
    ccy: "JPY",
    fxPair: "USD/JPY",
    discountPct: -1.8,
    hedgedCostPct: 2.1,
    note: "ADR −1.8% vs local · hedge adds 2.1%/yr",
  },
  {
    adr: "ETRN",
    adrName: "SAP ADR (US)",
    local: null,
    localName: null,
    ccy: "EUR",
    fxPair: "EUR/USD",
    discountPct: -0.9,
    hedgedCostPct: 1.7,
    note: "ADR −0.9% vs EUR spot · 1:1 ratio",
  },
];

export interface EmEtf {
  sym: "FXI" | "EWJ" | "EEM";
  name: string;
  betaUs: number;
  fxExposure: number; // % of return driven by USD moves
  note: string;
}

export const EM_ETFS: EmEtf[] = [
  { sym: "FXI", name: "iShares China Large", betaUs: 0.78, fxExposure: 0.34, note: "CNY drag ~34% of USD moves" },
  { sym: "EWJ", name: "iShares MSCI Japan", betaUs: 0.68, fxExposure: 0.31, note: "JPY carry-flip sensitive" },
  { sym: "EEM", name: "iShares MSCI EM", betaUs: 0.82, fxExposure: 0.46, note: "highest USD beta in the set" },
];

/** $ P&L per $1M notional for a 1% USD move */
export const usdMoveDollar = (usdMovePct: number, fxExposure: number, notional = 1_000_000) =>
  Math.round((usdMovePct / 100) * fxExposure * notional);

export const priceOf = (sym: string) => SEED_PRICES[sym] ?? 0;
