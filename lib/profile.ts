// lib/profile.ts — operator identity, API keys, sessions, audit activity (pure).

import { uid } from "./market";

export interface Apikey {
  id: string;
  label: string;
  prefix: string; // "xk_live_8f3a"
  scopes: string[];
  lastUsedAgoSec: number;
  status: "active" | "revoked";
}

export interface Session {
  id: string;
  device: string;
  ip: string;
  region: string;
  current: boolean;
  activeAgoSec: number;
}

export type ActivityTone = "order" | "risk" | "auth" | "signal" | "settings";

export interface Activity {
  id: string;
  tsAgoSec: number;
  tone: ActivityTone;
  verb: string;
  target: string;
  actor: "you" | "system";
}

export interface ProfileState {
  keys: Apikey[];
  sessions: Session[];
  activity: Activity[]; // newest-first
}

export const OPERATOR = {
  initial: "OP",
  name: "operator",
  handle: "@op.desk",
  email: "op@nxtrading.internal",
  roles: ["OPERATOR", "ADMIN"] as const,
  clearance: "RISK L3",
  memberSince: "Nov 2024",
  org: "NX Capital · Desk 4",
};

const HEX = "0123456789abcdef";
function freshPrefix() {
  let out = "xk_live_";
  for (let i = 0; i < 4; i++) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

function act(tone: ActivityTone, verb: string, target: string): Activity {
  return { id: uid(), tsAgoSec: 0, tone, verb, target, actor: "you" };
}

// ---------- actions ----------

export function rotateKey(state: ProfileState, id: string): ProfileState {
  const key = state.keys.find((k) => k.id === id);
  if (!key || key.status === "revoked") return state;
  const keys = state.keys.map((k) =>
    k.id === id ? { ...k, prefix: freshPrefix(), lastUsedAgoSec: 0, status: "active" as const } : k
  );
  const activity = [act("auth", "Rotated API key", key.label), ...state.activity].slice(0, 40);
  return { ...state, keys, activity };
}

export function revokeKey(state: ProfileState, id: string): ProfileState {
  const key = state.keys.find((k) => k.id === id);
  if (!key || key.status === "revoked") return state;
  const keys = state.keys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k));
  const activity = [act("auth", "Revoked API key", key.label), ...state.activity].slice(0, 40);
  return { ...state, keys, activity };
}

export function revokeSession(state: ProfileState, id: string): ProfileState {
  const s = state.sessions.find((x) => x.id === id);
  if (!s || s.current) return state; // current session is blocked
  const sessions = state.sessions.filter((x) => x.id !== id);
  const activity = [act("auth", "Revoked session", s.device), ...state.activity].slice(0, 40);
  return { ...state, sessions, activity };
}

// ---------- seed ----------

export function seedProfile(): ProfileState {
  const mk = (label: string, scopes: string[], used: number, status: Apikey["status"]): Apikey => ({
    id: uid(),
    label,
    prefix: freshPrefix(),
    scopes,
    lastUsedAgoSec: used,
    status,
  });

  return {
    keys: [
      mk("desk-runner", ["trading:read", "trading:write", "orders:manage"], 42, "active"),
      mk("backtest-pool", ["backtest:run", "data:read"], 7 * 3_600, "active"),
      mk("paper-feed", ["signals:read"], 26 * 60, "active"),
      mk("legacy-bot", ["*"], 21 * 86_400, "revoked"),
    ],
    sessions: [
      { id: uid(), device: "MacBook Pro · Chrome 126", ip: "10.4.2.18", region: "Ashburn, US", current: true, activeAgoSec: 840 },
      { id: uid(), device: "nx-cli 2.4 · Windows Terminal", ip: "10.4.7.91", region: "Frankfurt, DE", current: false, activeAgoSec: 26 * 3_600 },
      { id: uid(), device: "NX App 5.1 · iPhone 16", ip: "172.58.4.44", region: "Seattle, US", current: false, activeAgoSec: 3 * 86_400 },
    ],
    activity: [
      { id: uid(), tsAgoSec: 180, tone: "order", verb: "Closed half of", target: "BTC-USD · Momentum v4", actor: "you" },
      { id: uid(), tsAgoSec: 540, tone: "signal", verb: "Executed signal", target: "NVDA long · Orderflow Imbalance", actor: "you" },
      { id: uid(), tsAgoSec: 2_300, tone: "order", verb: "Placed stop", target: "TSLA short @ 338.20", actor: "you" },
      { id: uid(), tsAgoSec: 4_900, tone: "risk", verb: "Raised margin cap", target: "35% → 40% equity", actor: "you" },
      { id: uid(), tsAgoSec: 8_100, tone: "settings", verb: "Switched fee profile", target: "MAKER 0.8 → 1.2 bps", actor: "you" },
      { id: uid(), tsAgoSec: 14_400, tone: "auth", verb: "Rotated API key", target: "desk-runner", actor: "you" },
      { id: uid(), tsAgoSec: 36_000, tone: "order", verb: "Canceled 2 orders", target: "SOL-USD IOC sweep", actor: "you" },
      { id: uid(), tsAgoSec: 54_000, tone: "signal", verb: "Snoozed signal class", target: "Funding Capture · 4h", actor: "you" },
      { id: uid(), tsAgoSec: 3 * 3_600, tone: "risk", verb: "Tripped soft cap", target: "gross exp 78%", actor: "system" },
      { id: uid(), tsAgoSec: 22 * 3_600, tone: "settings", verb: "Enabled", target: "cross-venue arb desk", actor: "you" },
      { id: uid(), tsAgoSec: 2 * 86_400, tone: "auth", verb: "Revoked API key", target: "legacy-bot", actor: "you" },
    ],
  };
}

export function fmtAgo(sec: number): string {
  if (sec < 60) return "just now";
  if (sec < 3_600) return `${Math.round(sec / 60)}m`;
  if (sec < 86_400) return `${Math.round(sec / 3_600)}h`;
  return `${Math.round(sec / 86_400)}d`;
}
