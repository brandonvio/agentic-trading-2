// lib/settings.ts — operator settings model (pure, client-only, not persisted for demo).

export interface RiskSettings {
  maxPerTradePct: number; // % equity risked per trade
  maxBookExposurePct: number; // gross exposure cap, % of equity
  stopDistanceBps: number; // default stop distance
  killSwitchOn: boolean; // hard kill on risk breach
}

export interface ExecSettings {
  defaultVenue: string;
  tif: "GTC" | "IOC" | "FOK";
  reduceOnlyDefault: boolean;
  coalesceMs: number; // order aggregation window
  slippageBpsCap: number;
}

export interface NotifySettings {
  orders: boolean;
  signals: boolean;
  riskBreach: boolean;
  agentDecisions: boolean;
  dailyDigest: boolean;
  hours: boolean; // only within desk hours
}

export interface AppearanceSettings {
  accent: "indigo" | "cyan" | "emerald" | "amber";
  density: "comfortable" | "compact";
  compactTables: boolean;
}

export interface WorkspaceSettings {
  defaultPage: string;
  locale: string;
  utcOffset: string;
}

export interface SettingsState {
  risk: RiskSettings;
  exec: ExecSettings;
  notify: NotifySettings;
  appearance: AppearanceSettings;
  workspace: WorkspaceSettings;
}

export const ACCENTS: { key: AppearanceSettings["accent"]; swatch: string }[] = [
  { key: "indigo", swatch: "#6366f1" },
  { key: "cyan", swatch: "#22d3ee" },
  { key: "emerald", swatch: "#10b981" },
  { key: "amber", swatch: "#f59e0b" },
];

export const VENUES = ["OKX · T0", "BINANCE · T1", "COINBASE · T2", "ALPACA · EQ1"] as const;
export const TIFS = ["GTC", "IOC", "FOK"] as const;
export const DEFAULT_PAGES = [
  "Dashboard",
  "Strategies",
  "Signals",
  "Positions",
  "Orders",
] as const;

export const DEFAULTS: SettingsState = {
  risk: {
    maxPerTradePct: 1.5,
    maxBookExposurePct: 75,
    stopDistanceBps: 120,
    killSwitchOn: true,
  },
  exec: {
    defaultVenue: "OKX · T0",
    tif: "GTC",
    reduceOnlyDefault: false,
    coalesceMs: 250,
    slippageBpsCap: 8,
  },
  notify: {
    orders: true,
    signals: true,
    riskBreach: true,
    agentDecisions: false,
    dailyDigest: true,
    hours: false,
  },
  appearance: {
    accent: "indigo",
    density: "comfortable",
    compactTables: false,
  },
  workspace: {
    defaultPage: "Dashboard",
    locale: "en-US",
    utcOffset: "UTC−5 (ET)",
  },
};

// ---------- helpers ----------

export function deepEqual(a: SettingsState, b: SettingsState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const RANGES = {
  maxPerTradePct: { min: 0.1, max: 5, step: 0.1, unit: "% equity" },
  maxBookExposurePct: { min: 10, max: 200, step: 5, unit: "% equity" },
  stopDistanceBps: { min: 10, max: 1000, step: 10, unit: "bps" },
  coalesceMs: { min: 0, max: 2000, step: 50, unit: "ms" },
  slippageBpsCap: { min: 0, max: 50, step: 1, unit: "bps" },
} as const;
