// lib/search.ts — global command-palette index + pure query engine.

import { seedTickers } from "./market";
import { seedStrategies } from "./strategies";
import { ENGINES } from "./signals";
import { seedExchanges } from "./exchanges";
import { BROKERS } from "./brokers";
import { CONTRACTS } from "./futures";
import { MAJORS } from "./fx";
import { SPLITS, EM_ETFS } from "./intl";
import { LABELS } from "./rates";
import { MODELS } from "./brain";

export type HitKind = "Page" | "Symbol" | "Instrument" | "Strategy" | "Engine" | "Venue" | "Model" | "Broker";

export interface SearchHit {
  id: string;
  kind: HitKind;
  title: string;
  subtitle: string;
  href?: string;
  keywords: string[];
}

function words(...parts: (string | undefined)[]): string[] {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length >= 3);
}

// ---------- pages ----------

const PAGES: Array<{ title: string; subtitle: string; href: string; keywords: string[] }> = [
  { title: "Dashboard", subtitle: "Live overview — KPIs, curves, positions", href: "/", keywords: ["home", "overview", "main", "kpi", "desk"] },
  { title: "Market Core", subtitle: "Equities, ETFs, crypto, macro sessions", href: "/market", keywords: ["market", "sp500", "nasdaq", "macro", "fomc", "session"] },
  { title: "Options", subtitle: "Chains, greeks, IV skew, strategies", href: "/options", keywords: ["options", "greeks", "delta", "iv", "skew", "straddle", "maxpain"] },
  { title: "Futures", subtitle: "ES/NQ/GC/CL ladders, carry, rolls", href: "/futures", keywords: ["futures", "es", "nq", "gold", "oil", "ladder", "contango", "backwardation"] },
  { title: "Rates", subtitle: "Treasuries, curve, DV01, 2s10s", href: "/rates", keywords: ["treasuries", "yields", "10y", "2y", "30y", "dv01", "duration", "curve"] },
  { title: "FX", subtitle: "Majors, DXY, carry, swaps", href: "/fx", keywords: ["fx", "eurusd", "dxy", "carry", "swap", "safe-haven"] },
  { title: "ADR & EM", subtitle: "ADR splits, EM ETFs, FX drag", href: "/international", keywords: ["adr", "em", "etf", "fxi", "eem", "toyota", "sap", "discount"] },
  { title: "Strategies", subtitle: "All engine strategies, allocations, health", href: "/strategies", keywords: ["alloc", "engine", "strategy", "bias", "runbook", "lifecycle"] },
  { title: "Signals", subtitle: "Live signal feed per engine", href: "/signals", keywords: ["feed", "engine", "trigger", "confidence", "attribution"] },
  { title: "Positions", subtitle: "Open books, PnL, by-symbol", href: "/positions", keywords: ["book", "pnl", "open", "exposure", "flat"] },
  { title: "Orders", subtitle: "OMS: intents, gates, fills, blotter", href: "/orders", keywords: ["order", "oms", "fill", "latency", "bought power", "reject", "blotter"] },
  { title: "Backtests", subtitle: "Runs, walk-forward, Monte-Carlo, gates", href: "/backtests", keywords: ["backtest", "run", "sharpe", "drawdown", "walkforward", "montecarlo", "sensitivity"] },
  { title: "Risk Lab", subtitle: "VaR, limits, scenario stress", href: "/risk-lab", keywords: ["var", "limit", "scenario", "breach", "stress", "cvar"] },
  { title: "Performance", subtitle: "12-month heat, attribution, alpha", href: "/performance", keywords: ["returns", "heat", "attribution", "alpha", "bench", "pnl"] },
  { title: "AI Brain", subtitle: "Models, features, drift, registry", href: "/ai", keywords: ["ai", "brain", "model", "features", "drift", "champion", "weights"] },
  { title: "AI Agent", subtitle: "Reasoning stream, confidence, guardrails", href: "/ai-agent", keywords: ["llm", "model", "reasoning", "guardrail", "confidence"] },
  { title: "Brokers", subtitle: "Capabilities, fees, credit, reconciliation", href: "/brokers", keywords: ["broker", "ibkr", "fidelity", "alpaca", "fees", "margin", "credit", "flex"] },
  { title: "Exchanges", subtitle: "Venue health, balances, suspensions", href: "/exchanges", keywords: ["venue", "okx", "binance", "coinbase", "alpaca", "latency", "balance"] },
  { title: "Logs", subtitle: "Event stream with filters", href: "/logs", keywords: ["events", "audit", "stream", "warn", "error"] },
  { title: "Settings", subtitle: "Risk, execution, workspace", href: "/settings", keywords: ["config", "risk", "execution", "theme", "prefs"] },
  { title: "Profile", subtitle: "Operator, API keys, sessions", href: "/profile", keywords: ["account", "api", "key", "session", "operator", "operator"] },
];

// ---------- index ----------

function buildIndex(): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const p of PAGES) {
    hits.push({
      id: `page:${p.href}`,
      kind: "Page",
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
      keywords: [...words(p.title, p.subtitle), ...p.keywords],
    });
  }

  const symbols = seedTickers();
  for (const t of symbols) {
    const base = t.symbol.replace(/-.*/, "");
    hits.push({
      id: `sym:${t.symbol}`,
      kind: "Symbol",
      title: t.symbol,
      subtitle: t.name,
      keywords: [...words(t.symbol, t.name), base.toLowerCase(), base.toLowerCase() + " usd"],
    });
  }

  for (const s of seedStrategies()) {
    hits.push({
      id: `strat:${s.id}`,
      kind: "Strategy",
      title: s.label,
      subtitle: s.tagline,
      href: "/strategies",
      keywords: [...words(s.label, s.tagline, s.status), s.status],
    });
  }

  for (const e of ENGINES) {
    hits.push({
      id: `engine:${e.id}`,
      kind: "Engine",
      title: e.label,
      subtitle: `engine · ${e.id}`,
      href: "/signals",
      keywords: [...words(e.label), ...e.id.replace(/-/g, " ").split(" ")],
    });
  }

  // v2 instruments: futures, rates, FX, ADR/EM
  for (const c of CONTRACTS) {
    hits.push({
      id: `fut:${c.symbol}`,
      kind: "Instrument",
      title: c.symbol,
      subtitle: `futures · ${c.name}`,
      href: "/futures",
      keywords: [...words(c.symbol, c.name), "futures", "contract"],
    });
  }
  for (const l of LABELS) {
    hits.push({
      id: `rate:${l}`,
      kind: "Instrument",
      title: `${l}U`,
      subtitle: `treasury · ${l} yield`,
      href: "/rates",
      keywords: [...words(l, "treasury", "us"), l.toLowerCase(), l.toLowerCase() + "y"],
    });
  }
  for (const p of MAJORS) {
    const flat = p.replace("/", "").toLowerCase();
    hits.push({
      id: `fx:${p}`,
      kind: "Instrument",
      title: p,
      subtitle: "fx major",
      href: "/fx",
      keywords: [...words(p), flat],
    });
  }
  for (const s of SPLITS) {
    hits.push({
      id: `adr:${s.adr}`,
      kind: "Instrument",
      title: s.adr,
      subtitle: s.adrName,
      href: "/international",
      keywords: [...words(s.adr, s.adrName, s.local ?? undefined), "adr"],
    });
  }
  for (const e of EM_ETFS) {
    hits.push({
      id: `em:${e.sym}`,
      kind: "Instrument",
      title: e.sym,
      subtitle: `em etf · ${e.name}`,
      href: "/international",
      keywords: [...words(e.sym, e.name), "em", "etf"],
    });
  }
  for (const o of ["NVDA", "AAPL", "TSLA", "SPY"].map((s) => ({ s, href: "/options" }))) {
    hits.push({
      id: `opt:${o.s}`,
      kind: "Instrument",
      title: `${o.s} OPTS`,
      subtitle: `options chain · ${o.s}`,
      href: o.href,
      keywords: [o.s.toLowerCase(), "options", "calls", "puts", "greeks", "iv"],
    });
  }

  // v2 models (AI Brain)
  for (const m of MODELS) {
    hits.push({
      id: `model:${m.id}`,
      kind: "Model",
      title: `${m.name} ${m.version}`,
      subtitle: `model · ${m.universe}`,
      href: "/ai",
      keywords: [...words(m.id, m.name, m.version, m.universe), ...m.id.replace(/-/g, " ").split(" ")],
    });
  }

  // brokers
  for (const b of BROKERS) {
    hits.push({
      id: `broker:${b.id}`,
      kind: "Broker",
      title: b.name,
      subtitle: `broker · ${b.region} · ${b.feeBps}bps`,
      href: "/brokers",
      keywords: [...words(b.name, b.id, b.region), b.short.toLowerCase(), "broker"],
    });
  }

  const venues = seedExchanges().venues;
  for (const v of venues) {
    hits.push({
      id: `venue:${v.name.toLowerCase()}`,
      kind: "Venue",
      title: v.name,
      subtitle: `${v.tag} · ${v.region}`,
      href: "/exchanges",
      keywords: [...words(v.name, v.tag, v.region), v.name.toLowerCase()],
    });
  }

  return hits;
}

export const INDEX: SearchHit[] = buildIndex();

// ---------- query ----------

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function queryHits(q: string, max = 12): SearchHit[] {
  const query = norm(q).trim();
  if (!query) {
    // jump-to shortcuts: pages only, stable order
    return INDEX.filter((h) => h.kind === "Page").slice(0, 8);
  }

  const tokens = query.split(/\s+/).filter((t) => t.length > 0);
  const scored = INDEX.map((h) => {
    const hay = norm(h.title) + " " + norm(h.subtitle) + " " + h.keywords.map(norm).join(" ");
    const title = norm(h.title);
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const inTitle = title.includes(t);
      const inHay = hay.includes(t);
      if (!inTitle && !inHay) {
        all = false;
        break;
      }
      score += inTitle ? 3 : 1;
    }
    if (all && query.startsWith(tokens[0]) && title.startsWith(query.slice(0, Math.min(4, query.length)))) score += 2;
    return { h, score, all };
  }).filter((r) => r.all && r.score >= tokens.length);

  // deterministic stable sort: score desc, then kind rank (pages first), then title
  const kindRank: Record<HitKind, number> = { Page: 0, Symbol: 1, Instrument: 2, Strategy: 3, Engine: 4, Model: 5, Venue: 6, Broker: 7 };
  scored.sort((a, b) => b.score - a.score || kindRank[a.h.kind] - kindRank[b.h.kind] || a.h.title.localeCompare(b.h.title));
  return scored.slice(0, max).map((r) => r.h);
}
