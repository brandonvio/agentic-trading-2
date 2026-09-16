// Money model: margin → buying power → interest → fees → reconcile line.
// All functions pure; every number derived from inputs.

import { meta } from "./instruments";
import type { Broker } from "./brokers";
import type { Position } from "./positions";

export interface PosMargin {
  symbol: string;
  mv: number; // signed market value
  marginRequired: number;
  rule: string;
}

/** per-position margin by asset-class rule */
export function positionMargin(p: Position): PosMargin {
  const m = meta(p.symbol);
  const mv = p.side === "SHORT" ? -Math.abs(p.qty) * p.markPx * m.multiplier : Math.abs(p.qty) * p.markPx * m.multiplier;
  let marginRequired = 0;
  let rule = "";
  switch (m.type) {
    case "future": {
      marginRequired = Math.abs(p.qty) * (m.marginPerUnit || p.markPx * m.multiplier * 0.12);
      rule = `fixed ${Math.round(m.marginPerUnit || 0)}/ctn`;
      break;
    }
    case "equity":
    case "etf":
    case "intl": {
      const fraction = p.side === "SHORT" ? 0.25 : 0.5;
      marginRequired = Math.abs(mv) * fraction;
      rule = `${p.side === "SHORT" ? "short 25%" : "long 50%"}`;
      break;
    }
    case "treasury": {
      marginRequired = Math.abs(mv) * 0.1;
      rule = "10% cash backing";
      break;
    }
    case "fx": {
      marginRequired = Math.abs(mv) * 0.02;
      rule = "2% reserve";
      break;
    }
    case "crypto": {
      marginRequired = 0;
      rule = "spot, cash-backed";
      break;
    }
  }
  return { symbol: p.symbol, mv, marginRequired, rule };
}

export interface MoneyState {
  cashUsd: number;
  marketValue: number;
  equity: number;
  initialMargin: number;
  buyingPower: number; // credit limit unused
  usedPct: number; // 0..100 of credit limit
  unrealized: number;
  interest30d: number; // debit interest cost for one month
  fees30d: number;
}

/**
 * moneyFor: broker cash + open book → margin / buying power / interest / fees.
 *  - equity  = cash + MV of the open book (longs positive, shorts negative)
 *  - initialMargin = Σ per-position margin by asset-class rule
 *  - debit   = max(0, MV − cash): leveraged longs borrow the excess
 *  - interest = debit × marginRate / 12 (one month)
 *  - fees    = gross turnover × feeBps (round-turn proxy)
 */
export function moneyFor(broker: Broker, positions: Position[]): MoneyState {
  const rows = positions.map(positionMargin);
  const MV = rows.reduce((s, r) => s + r.mv, 0);
  const initialMargin = rows.reduce((s, r) => s + r.marginRequired, 0);
  const equity = broker.cashUsd + MV;
  const debit = Math.max(0, MV - broker.cashUsd);
  const interest30d = (debit * broker.marginRate) / 12;
  const gross = rows.reduce((s, r) => s + Math.abs(r.mv), 0);
  const fees30d = (gross * broker.feeBps) / 10_000;
  const buyingPower = Math.max(0, broker.creditLimitUsd - initialMargin);
  const usedPct = Math.min(100, Math.round((initialMargin / Math.max(1, broker.creditLimitUsd)) * 100));
  return {
    cashUsd: broker.cashUsd,
    marketValue: MV,
    equity,
    initialMargin,
    buyingPower,
    usedPct,
    unrealized: 0,
    interest30d,
    fees30d,
  };
}

/** FLEX-style daily reconcile line */
export interface ReconcileLine {
  broker: string;
  cash: number;
  marketValue: number;
  fees: number;
  interest: number;
  equity: number;
  initialMargin: number;
  buyingPower: number;
}

export function reconcile(brokers: Broker[], positionsByBroker: Record<string, Position[]>): ReconcileLine[] {
  return brokers.map((b) => {
    const m = moneyFor(b, positionsByBroker[b.id] ?? []);
    return {
      broker: b.short,
      cash: m.cashUsd,
      marketValue: m.marketValue,
      fees: m.fees30d,
      interest: m.interest30d,
      equity: m.equity,
      initialMargin: m.initialMargin,
      buyingPower: m.buyingPower,
    };
  });
}
