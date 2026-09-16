"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { MarketCore, Ticker } from "../lib/market";
import { regimeLabel } from "../lib/market";
import { isRiskOff } from "../lib/market";
import { equitySession, futuresIsOpen, fxIsOpen } from "../lib/sessions";
import { eventState, seedEvents } from "../lib/macro";
import { bestVenue } from "../lib/brokers";
import { moneyFor } from "../lib/money";
import { seedPositions } from "../lib/positions";
import { Delta, LiveDot } from "./ui";
import { SearchTrigger, SearchTriggerMobile } from "./search";

export interface NavItem {
  label: string;
  href?: string;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Trading",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Strategies", href: "/strategies" },
      { label: "Signals", href: "/signals" },
      { label: "Positions", href: "/positions" },
      { label: "Orders", href: "/orders" },
    ],
  },
  {
    group: "Markets",
    items: [
      { label: "Market Core", href: "/market" },
      { label: "Options", href: "/options" },
      { label: "Futures", href: "/futures" },
      { label: "Rates", href: "/rates" },
      { label: "FX", href: "/fx" },
      { label: "ADR & EM", href: "/international" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { label: "AI Brain", href: "/ai" },
      { label: "Backtests", href: "/backtests" },
      { label: "Risk Lab", href: "/risk-lab" },
      { label: "Performance", href: "/performance" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "AI Agent", href: "/ai-agent" },
      { label: "Brokers", href: "/brokers" },
      { label: "Exchanges", href: "/exchanges" },
      { label: "Logs", href: "/logs" },
      { label: "Settings", href: "/settings" },
      { label: "Profile", href: "/profile" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    !!item.href &&
    (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-edge bg-surface/60">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-edge/70">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-cyan text-white font-bold shadow-lg shadow-accent/30">
          NX
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">NX Trading</div>
          <div className="text-[10px] text-muted">ALGO CONSOLE</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-5">
        {NAV.map((g) => (
          <div key={g.group} className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {g.group}
            </div>
            {g.items.map((item) => {
              const active = isActive(item);
              const cls = [
                "group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent/12 text-white ring-1 ring-accent/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              ].join(" ");
              const content = (
                <>
                  <span className="flex items-center gap-2.5">
                    <span
                      className={[
                        "h-1.5 w-1.5 rounded-full transition-all",
                        active ? "bg-accent-2 shadow-[0_0_8px] shadow-accent-2" : "bg-slate-600 group-hover:bg-slate-400",
                      ].join(" ")}
                    />
                    {item.label}
                  </span>
                  <span
                    className={
                      "h-4 w-4 rounded-[5px] border " +
                      (active ? "border-accent/50 bg-accent/20" : "border-slate-700/70 group-hover:border-slate-500")
                    }
                  />
                </>
              );
              return item.href ? (
                <Link key={item.label} href={item.href} className={cls}>
                  {content}
                </Link>
              ) : (
                <button key={item.label} type="button" className={cls}>
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-edge/70 p-3">
        <div className="rounded-lg border border-edge bg-surface-2/70 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Engine</span>
            <span className="flex items-center gap-1.5 text-long">
              <LiveDot /> LIVE
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Latency</span>
            <span className="font-mono text-slate-200">1.4ms</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Uptime</span>
            <span className="font-mono text-slate-200">42d 07h</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TickerTape({ tickers }: { tickers: Ticker[] }) {
  const row = (
    <div className="flex items-center gap-7 pr-7">
      {tickers.map((t) => (
        <div key={t.symbol} className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-slate-200">{t.symbol}</span>
          <span className="font-mono tabular-nums text-slate-400">
            {t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <Delta value={t.change} className="text-[11px]" />
        </div>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden border-b border-edge bg-surface/40">
      <div className="ticker-track flex w-max py-1.5">
        {row}
        {row}
      </div>
    </div>
  );
}

export function TopBar({ clock, core, now }: { clock: string; core?: MarketCore; now?: number }) {
  const t = (now ?? 0) > 0 ? (now ?? 0) : 0;
  const regime = core?.regime;
  const ev = t > 0 ? eventState(t, seedEvents(t)) : null;
  const d = t > 0 ? new Date(t) : null;
  const eq = d ? equitySession(d) : null;
  const fut = d ? futuresIsOpen(d) : null;
  const fx = d ? fxIsOpen(d) : null;
  const money = useMemo(() => {
    const ib = bestVenue("equity");
    if (!ib) return null;
    return moneyFor(ib, seedPositions().positions);
  }, []);
  const volTone = regime
    ? regime.volState === "calm" ? "text-long" : regime.volState === "chop" ? "text-amber" : "text-short"
    : "text-muted";
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-surface/60 px-4 backdrop-blur">
      {/* mobile brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-cyan text-[11px] font-bold text-white">
          NX
        </div>
      </div>

      <SearchTrigger />
      <SearchTriggerMobile />

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* regime (V7: computed, not decorative) */}
        {regime ? (
          <span
            title={`${regime.driver} · since ${new Date(regime.since).toISOString().slice(11, 16)}Z`}
            className={`hidden md:inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${
              isRiskOff(regime)
                ? "border-short/40 bg-short/10 text-short"
                : "border-edge bg-surface-2/60 text-slate-300"
            }`}
          >
            <LiveDot color={regime.volState === "calm" ? "var(--color-long)" : regime.volState === "chop" ? "var(--color-amber)" : "var(--color-short)"} />
            {regimeLabel(regime)}
            <span className={`font-mono text-[10px] ${volTone}`}>{regime.volState}</span>
          </span>
        ) : (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-long/30 bg-long/10 px-2 py-1 text-[11px] font-medium text-long">
            <LiveDot /> MARKET OPEN
          </span>
        )}
        {/* session coverage (V7) */}
        {eq && (
        <span className="hidden xl:inline-flex items-center gap-2 rounded-md border border-edge bg-surface-2/60 px-2 py-1 font-mono text-[10px] text-slate-400">
          <span className={eq === "open" || eq === "lunch" ? "text-long" : "text-slate-600"}>EQ {eq === "open" ? "OPEN" : eq.toUpperCase()}</span>
          <span className={fut ? "text-long" : "text-slate-600"}>FUT {fut ? "OPEN" : "CLOSED"}</span>
          <span className={fx ? "text-long" : "text-slate-600"}>FX {fx ? "24×5" : "CLOSED"}</span>
        </span>
        )}
        {/* next macro print (V7) */}
        {ev && (
          <span
            title="next scheduled print · volatility armed ahead"
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
              ev.phase === "live" ? "animate-pulse border-amber/50 bg-amber/10 text-amber" : "border-edge bg-surface-2/60 text-slate-400"
            }`}
          >
            <span className="font-mono">
              {(ev.event ?? ev.nextEvent) ? `${(ev.event ?? ev.nextEvent)!.kind} ${ev.countdown}` : "NO PRINTS"}
            </span>
          </span>
        )}
        {/* buying power (V5 money) */}
        {money && (
          <span
            title={`IBKR debit interest −${money.interest30d.toLocaleString("en-US", { maximumFractionDigits: 0 })} /mo · cash ${money.cashUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface-2/60 px-2 py-1 text-[11px] text-slate-300"
          >
            <span className="rounded bg-accent/20 px-1 font-mono text-[9px] font-bold text-accent-2">IB</span>
            BP <span className="font-mono tabular-nums">${(money.buyingPower / 1000).toFixed(0)}K</span>
            <span className="font-mono text-[10px] tabular-nums text-amber">used ${(money.initialMargin / 1000).toFixed(1)}K</span>
          </span>
        )}
        <span className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent-2">
          <LiveDot color="var(--color-accent)" /> AI ACTIVE
        </span>
        <div className="hidden sm:block text-right leading-none">
          <div className="font-mono text-[13px] tabular-nums text-slate-200">{clock}</div>
          <div className="text-[10px] text-muted">UTC · NYSE</div>
        </div>
        <Link
          href="/profile"
          aria-label="Operator profile"
          className="flex items-center gap-2 rounded-lg border border-edge bg-surface-2/60 py-1 pl-1 pr-3 transition hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-slate-600 to-slate-800 text-[11px] font-semibold text-white">
            OP
          </div>
          <div className="hidden md:block leading-none">
            <div className="text-[11.5px] font-medium text-slate-200">operator</div>
            <div className="text-[9.5px] text-muted">ADMIN</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
