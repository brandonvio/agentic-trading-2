// lib/exchanges.ts — venue healthboard model, pure.

import { uid } from "./market";

export type VenueStatus = "online" | "degraded" | "maintenance";

export interface Venue {
  name: string;
  tag: string; // "OKX · T0"
  status: VenueStatus;
  p50ms: number;
  p99ms: number;
  balUsd: number;
  feeBps: number;
  rlimitUsed: number;
  rlimitMax: number;
  region: string;
  lastSyncAgoSec: number;
  flapTicks?: number; // remaining degradation ticks (internal)
}

export interface VenueEvent {
  id: string;
  tsAgoSec: number;
  venue: string;
  msg: string;
  level: "ok" | "warn" | "err";
}

export interface ExchangeState {
  venues: Venue[];
  events: VenueEvent[]; // newest-first, capped
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function ev(venue: string, msg: string, level: VenueEvent["level"], ago = 0): VenueEvent {
  return { id: uid(), tsAgoSec: ago, venue, msg, level };
}

export function seedExchanges(): ExchangeState {
  const v = (
    name: string,
    tag: string,
    region: string,
    p50: number,
    p99: number,
    bal: number,
    fee: number,
    used: number,
    max: number
  ): Venue => ({
    name,
    tag,
    status: "online",
    p50ms: p50,
    p99ms: p99,
    balUsd: bal,
    feeBps: fee,
    rlimitUsed: used,
    rlimitMax: max,
    region,
    lastSyncAgoSec: 1,
  });

  return {
    venues: [
      v("OKX", "OKX · T0", "Tokyo · JP", 18, 64, 312_400, 2.0, 412, 1200),
      v("BINANCE", "BINANCE · T1", "Tokyo · JP", 21, 78, 287_900, 1.8, 356, 1200),
      v("COINBASE", "COINBASE · T2", "Virginia · US", 34, 121, 154_200, 2.5, 233, 900),
      v("ALPACA", "ALPACA · EQ1", "New York · US", 29, 96, 61_800, 0.0, 88, 600),
      v("ARBITRAGE", "ARBITRAGE", "Internal mesh", 9, 24, 0, 0.0, 141, 500),
    ],
    events: [
      ev("COINBASE", "orderbook resync took 412ms", "warn", 42),
      ev("BINANCE", "fill ack 0x8f21 · 62ms", "ok", 61),
      ev("OKX", "session heartbeat ok", "ok", 90),
      ev("ALPACA", "market data window opened", "ok", 130),
      ev("ARBITRAGE", "mesh route rebalanced", "ok", 170),
      ev("COINBASE", "rate-limit 429 on /orders", "err", 210),
      ev("BINANCE", "fill ack 0x7d04 · 58ms", "ok", 260),
      ev("OKX", "session heartbeat ok", "ok", 305),
    ],
  };
}

// ---------- tick ----------

export function tickExchanges(state: ExchangeState): ExchangeState {
  const events = state.events
    .map((e) => ({ ...e, tsAgoSec: e.tsAgoSec + 2 }))
    .filter((e) => e.tsAgoSec < 1200);

  const venues = state.venues.map((v) => {
    let next: Venue = { ...v };

    // recover an ongoing flap
    if (next.flapTicks !== undefined) {
      next.flapTicks -= 1;
      if (next.flapTicks <= 0) {
        next = {
          ...next,
          flapTicks: undefined,
          status: "online",
          p50ms: Math.round(next.p50ms * 0.45),
          p99ms: Math.round(next.p99ms * 0.5),
        };
        events.unshift(ev(v.name, "recovered — status back to online", "ok"));
      }
    }

    // start a new flap
    if (!next.flapTicks && Math.random() < 0.04) {
      next = {
        ...next,
        status: Math.random() < 0.8 ? "degraded" : "maintenance",
        p50ms: Math.round(next.p50ms * (2.2 + Math.random() * 2)),
        p99ms: Math.round(next.p99ms * (2.6 + Math.random() * 2)),
        flapTicks: 1 + (Math.random() < 0.5 ? 1 : 0),
      };
      events.unshift(
        next.status === "maintenance"
          ? ev(v.name, "maintenance window started", "err")
          : ev(v.name, "latency spike — status degraded", "warn")
      );
    } else if (!next.flapTicks) {
      // steady jitter + rate-limit walk toward max
      next = {
        ...next,
        p50ms: Math.max(4, Math.round(next.p50ms + (Math.random() - 0.5) * 6)),
        p99ms: Math.max(next.p50ms + 12, Math.round(next.p99ms + (Math.random() - 0.45) * 22)),
        rlimitUsed: clamp(
          Math.round(next.rlimitUsed + (Math.random() < 0.5 ? -1 : 1) * Math.round(next.rlimitMax * (0.04 + Math.random() * 0.12))),
          Math.round(next.rlimitMax * 0.15),
          next.rlimitMax
        ),
        lastSyncAgoSec: 0 + Math.round(Math.random() * 2),
      };
    } else {
      next.lastSyncAgoSec += 2;
    }
    return next;
  });

  return { venues, events: events.slice(0, 30) };
}

export function suspendVenue(state: ExchangeState, name: string): ExchangeState {
  const v = state.venues.find((x) => x.name === name);
  if (!v || v.status === "maintenance") return state;
  const venues = state.venues.map((x) =>
    x.name === name
      ? { ...x, status: "maintenance" as const, flapTicks: undefined, rlimitUsed: 0, lastSyncAgoSec: x.lastSyncAgoSec + 999 }
      : x
  );
  const events = [ev(name, "venue suspended by operator from healthboard", "err"), ...state.events].slice(0, 30);
  return { venues, events };
}

export function fmtAge(sec: number): string {
  if (sec <= 2) return "now";
  if (sec < 60) return `${sec}s`;
  if (sec < 3_600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3_600)}h`;
}
