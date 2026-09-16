"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, TopBar, TickerTape } from "./chrome";
import { SearchProvider } from "./search";
import { nowTime, seedCore, tickCore, type MarketCore, type Ticker } from "../lib/market";

/**
 * Hydration-safe mount flag. `useSyncExternalStore` returns `false` during SSR
 * and the very first client paint, then `true` after hydration — no setState
 * in effect, no mismatch, no lint complaints.
 */
const noSub = () => () => {};
export function useMounted(): boolean {
  return useSyncExternalStore(noSub, () => true, () => false);
}

/** Deterministic pre-mount paint shared by all console pages. */
export function Splash({ detail = "Initializing execution engine…" }: { detail?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-5 bg-background text-slate-300">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-xl border border-accent/40 bg-accent/10" />
        <div className="absolute inset-0 animate-ping rounded-xl border border-accent/30" style={{ animationDuration: "2.2s" }} />
        <div className="absolute inset-2.5 rounded-lg bg-gradient-to-br from-accent to-cyan" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-semibold tracking-tight text-slate-100">NX TRADING</div>
        <div className="text-[12px] text-slate-500">{detail}</div>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-accent/20 via-accent to-cyan" style={{ animationDuration: "1.2s" }} />
      </div>
    </div>
  );
}

function useClock(): string {
  const [clock, setClock] = useState(() => "00:00:00");
  useEffect(() => {
    const id = setInterval(() => setClock(nowTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

/** Top-bar-only market core: regime chip + macro state derive from the same lib as every page. */
function useTopCore(): MarketCore {
  const [core, setCore] = useState<MarketCore>(() => seedCore(1767795600000));
  useEffect(() => {
    const id = setInterval(() => setCore((c) => tickCore(c, Date.now())), 4000);
    return () => clearInterval(id);
  }, []);
  return core;
}

/**
 * Shared application frame: sidebar + top bar + ticker tape + scrolling main.
 * `mobileStrip` is an optional narrow control row for small screens.
 */
export function ConsoleShell({
  tickers,
  mobileStrip,
  children,
}: {
  tickers: Ticker[];
  mobileStrip?: ReactNode;
  children: ReactNode;
}) {
  const clock = useClock();
  const topCore = useTopCore();
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <SearchProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar clock={clock} core={topCore} now={nowMs} />
          <TickerTape tickers={tickers} />
          {mobileStrip}
          <main className="flex-1 overflow-y-auto scroll-thin p-3 sm:p-4">
            {children}
            <RelatedLinks />
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}

// ---------- cross-link footer (V10: every page reaches its relatives in one click) ----------

const RELATED: Record<string, { label: string; href: string }[]> = {
  "/": [{ label: "Signals", href: "/signals" }, { label: "Strategies", href: "/strategies" }, { label: "AI Brain", href: "/ai" }],
  "/market": [{ label: "Options", href: "/options" }, { label: "Futures", href: "/futures" }, { label: "Rates", href: "/rates" }],
  "/options": [{ label: "Futures", href: "/futures" }, { label: "Market Core", href: "/market" }, { label: "Risk Lab", href: "/risk-lab" }],
  "/futures": [{ label: "Rates", href: "/rates" }, { label: "Market Core", href: "/market" }, { label: "Orders", href: "/orders" }],
  "/rates": [{ label: "Futures", href: "/futures" }, { label: "Risk Lab", href: "/risk-lab" }, { label: "Performance", href: "/performance" }],
  "/fx": [{ label: "ADR & EM", href: "/international" }, { label: "Market Core", href: "/market" }, { label: "Brokers", href: "/brokers" }],
  "/international": [{ label: "FX", href: "/fx" }, { label: "Market Core", href: "/market" }, { label: "Brokers", href: "/brokers" }],
  "/ai": [{ label: "Signals", href: "/signals" }, { label: "Strategies", href: "/strategies" }, { label: "Backtests", href: "/backtests" }],
  "/ai-agent": [{ label: "AI Brain", href: "/ai" }, { label: "Logs", href: "/logs" }, { label: "Orders", href: "/orders" }],
  "/backtests": [{ label: "Strategies", href: "/strategies" }, { label: "AI Brain", href: "/ai" }, { label: "Risk Lab", href: "/risk-lab" }],
  "/brokers": [{ label: "Orders", href: "/orders" }, { label: "Exchanges", href: "/exchanges" }, { label: "Settings", href: "/settings" }],
  "/exchanges": [{ label: "Brokers", href: "/brokers" }, { label: "Orders", href: "/orders" }, { label: "Logs", href: "/logs" }],
  "/logs": [{ label: "AI Agent", href: "/ai-agent" }, { label: "Orders", href: "/orders" }, { label: "Settings", href: "/settings" }],
  "/orders": [{ label: "Positions", href: "/positions" }, { label: "Brokers", href: "/brokers" }, { label: "Logs", href: "/logs" }],
  "/positions": [{ label: "Orders", href: "/orders" }, { label: "Performance", href: "/performance" }, { label: "Risk Lab", href: "/risk-lab" }],
  "/performance": [{ label: "Strategies", href: "/strategies" }, { label: "Positions", href: "/positions" }, { label: "AI Brain", href: "/ai" }],
  "/risk-lab": [{ label: "Rates", href: "/rates" }, { label: "Positions", href: "/positions" }, { label: "AI Brain", href: "/ai" }],
  "/settings": [{ label: "Brokers", href: "/brokers" }, { label: "Profile", href: "/profile" }, { label: "Logs", href: "/logs" }],
  "/signals": [{ label: "Strategies", href: "/strategies" }, { label: "AI Brain", href: "/ai" }, { label: "Orders", href: "/orders" }],
  "/strategies": [{ label: "Backtests", href: "/backtests" }, { label: "AI Brain", href: "/ai" }, { label: "Signals", href: "/signals" }],
  "/profile": [{ label: "Settings", href: "/settings" }, { label: "Exchanges", href: "/exchanges" }, { label: "Logs", href: "/logs" }],
};

function RelatedLinks() {
  const pathname = usePathname();
  const links = RELATED[pathname] ?? [{ label: "Dashboard", href: "/" }, { label: "AI Brain", href: "/ai" }];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-edge pt-3 text-[10.5px] text-slate-500">
      <span className="uppercase tracking-[0.12em] text-slate-600">related</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-md border border-edge bg-surface-2/40 px-2 py-1 text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-2">
          {l.label}
        </Link>
      ))}
      <span className="ml-auto font-mono text-slate-600">NX-TRADING v2 · simulated data · not investment advice</span>
    </div>
  );
}
