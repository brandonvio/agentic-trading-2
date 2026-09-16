// lib/logs.ts — system log stream model, pure.

import { nowTime, uid } from "./market";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SYS";
export type LogSource = "market" | "signal" | "order" | "risk" | "agent" | "venue" | "core";

export interface LogLine {
  id: string;
  ts: string; // HH:MM:SS
  level: LogLevel;
  source: LogSource;
  msg: string;
  meta?: string;
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const SYM = ["BTC-USD", "ETH-USD", "SOL-USD", "TSLA", "NVDA", "AMD", "COIN"] as const;
const VENUE = ["OKX", "BINANCE", "COINBASE", "ALPACA"] as const;
const STRAT = ["Momentum v4", "Funding Capture", "Orderflow Imbalance", "Cross-Venue Arb", "Vol Arb v2"] as const;

const INFO_POOL: [LogSource, () => string][] = [
  ["market", () => `book depth refreshed ${pick(SYM)} 500ms`],
  ["market", () => `tick batch ingested ${pick(SYM)} ×48`],
  ["signal", () => `signal generated ${pick(STRAT)} → ${pick(SYM)} long`],
  ["signal", () => `score refreshed ${pick(STRAT)} conf ${(0.55 + Math.random() * 0.4).toFixed(2)}`],
  ["order", () => `order placed ${pick(SYM)} ${pick([0.2, 0.5, 1.2, 2.8]).toFixed(1)} @ ${pick(VENUE)}`],
  ["order", () => `fill ack ${pick(VENUE)} ${(40 + Math.random() * 80).toFixed(0)}ms`],
  ["risk", () => `exposure check ok 68% of cap`],
  ["risk", () => `margin headroom ${(1.8 + Math.random() * 1.4).toFixed(2)}×`],
  ["venue", () => `${pick(VENUE)} heartbeat ok`],
  ["core", () => `heartbeat all services nominal`],
];

const DEBUG_POOL: [LogSource, string][] = [
  ["market", "orderbook snapshot decoded 214 rows"],
  ["market", "mid recomputed ${}"],
  ["order", "coalescing window open 250ms"],
  ["order", "sig check on wire order ok"],
  ["signal", "feature vector hashed f3…a2"],
  ["core", "gc pause 2.1ms"],
  ["core", "queue drain 12 msgs"],
  ["venue", "ws ping/pong 8ms"],
];

const WARN_POOL: [LogSource, string][] = [
  ["market", `stale quote ${pick(SYM)} 1.8s`],
  ["order", `partial fill only 40% ${pick(SYM)}`],
  ["venue", `${pick(VENUE)} latency p99 220ms`],
  ["venue", "rate-limit 82% window used"],
  ["risk", "gross exposure 74% of cap"],
  ["signal", `low-confidence drop ${pick(STRAT)}`],
];

const ERROR_POOL: [LogSource, string][] = [
  ["venue", `${pick(VENUE)} reconnect attempt 1/5`],
  ["order", `reject: not-enough-funds ${pick(SYM)}`],
  ["market", `feed gap ${pick(SYM)} 3.4s`],
  ["risk", `limit trip ${pick(SYM)} stop hit`],
];

const SYS_POOL: string[] = [
  "checkpoint written 12.8MB",
  "rotation: rolling 2025-06-21",
  "cron: eod rollup scheduled 17:00 ET",
  "config reloaded (0 overrides)",
  "keyring sealed (4 keys)",
];

function line(level: LogLevel, source: LogSource, msg: string, meta?: string): LogLine {
  return { id: uid(), ts: nowTime(), level, source, msg, meta };
}

export function seedLines(): LogLine[] {
  const rows: LogLine[] = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.random();
    if (r < 0.5) {
      const [s, fn] = pick(INFO_POOL);
      rows.push(line("INFO", s, fn()));
    } else if (r < 0.8) {
      const [s, m] = pick(DEBUG_POOL);
      rows.push(line("DEBUG", s, m.replace("{}", pick(SYM))));
    } else if (r < 0.93) {
      const [s, m] = pick(WARN_POOL);
      rows.push(line("WARN", s, m));
    } else if (r < 0.987) {
      const [s, m] = pick(ERROR_POOL);
      rows.push(line("ERROR", s, m));
    } else {
      rows.push(line("SYS", "core", pick(SYS_POOL)));
    }
  }
  return rows;
}

export function tickLines(existing: LogLine[]): LogLine[] {
  const n = 1 + Math.floor(Math.random() * 3); // 1-3 new lines
  const fresh: LogLine[] = [];
  // occasional burst: 8% chance of a WARN/ERROR pair
  const burst = Math.random() < 0.08;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (burst && i === 0) {
      const [s, m] = pick(ERROR_POOL);
      fresh.push(line("ERROR", s, m));
      const [s2, m2] = pick(WARN_POOL);
      fresh.push(line("WARN", s2, m2));
    } else if (r < 0.46) {
      const [s, fn] = pick(INFO_POOL);
      fresh.push(line("INFO", s, fn()));
    } else if (r < 0.82) {
      const [s, m] = pick(DEBUG_POOL);
      fresh.push(line("DEBUG", s, m.replace("{}", pick(SYM))));
    } else if (r < 0.95) {
      const [s, m] = pick(WARN_POOL);
      fresh.push(line("WARN", s, m));
    } else if (r < 0.985) {
      const [s, m] = pick(ERROR_POOL);
      fresh.push(line("ERROR", s, m));
    } else {
      fresh.push(line("SYS", "core", pick(SYS_POOL)));
    }
  }
  return [...fresh, ...existing].slice(0, 200);
}

export function clearLines(): LogLine[] {
  return [{ id: uid(), ts: nowTime(), level: "SYS", source: "core", msg: "stream cleared by operator" }];
}

export const LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "SYS"];
export const SOURCES: LogSource[] = ["market", "signal", "order", "risk", "agent", "venue", "core"];
