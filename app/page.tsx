"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConsoleShell, Splash, useMounted } from "../components/framework";
import { KpiStrip, type KpiData, AiAgent } from "../components/hero";
import { PriceChart } from "../components/chart";
import { Positions, Signals } from "../components/tables";
import { RiskPanel, Movers, OrderBook, Terminal, Strategies, usd } from "../components/panels";
import {
  SEED_POSITIONS,
  logPool,
  makeSignal,
  nowTime,
  pick,
  rand,
  positionPnl,
  seedSignals,
  seedTickers,
  tickPrices,
  uid,
  type LogLine,
  type Position,
  type Signal,
  type Ticker,
} from "../lib/market";

const CAPITAL = 1_000_000;

function seedEquity(n = 60): number[] {
  const out: number[] = [];
  let v = CAPITAL * 0.94;
  for (let i = 0; i < n; i++) {
    v *= 1 + (Math.random() - 0.44) * 0.012;
    out.push(v);
  }
  const scale = (CAPITAL * 1.06) / out[out.length - 1];
  return out.map((x) => x * scale);
}

function makeLog(level: LogLine["level"], text: string): LogLine {
  return { id: uid(), ts: nowTime(), level, text };
}

export default function Home() {
  const [tickers, setTickers] = useState<Ticker[]>(() => seedTickers());
  const [signals, setSignals] = useState<Signal[]>(() => seedSignals());
  const [positions] = useState<Position[]>(SEED_POSITIONS);
  const [equity, setEquity] = useState<number[]>(() => seedEquity());
  const [dailyPnl, setDailyPnl] = useState(18642);
  const [strategyPnl, setStrategyPnl] = useState<Record<string, number>>({
    "momentum-v4": 4210,
    "funding-capture": 3120,
    "orderflow-imb": 2880,
    "vol-breakout": 1540,
    "mean-revert-ml": -620,
  });
  const [log, setLog] = useState<LogLine[]>(() =>
    ["info", "ok", "ai", "info", "warn"].map((lv, i) =>
      makeLog(lv as LogLine["level"], logPool[i % logPool.length][1])
    )
  );
  const [winRate, setWinRate] = useState(61);
  const [sharpe, setSharpe] = useState(2.14);
  const [confidence, setConfidence] = useState(78);
  const active = 5;
  const [risk, setRisk] = useState({ score: 62, exposure: 71, var95: 38, maxDD: 4.2, leverage: 2.4, maxPos: 18 });
  const [paused, setPaused] = useState(false);
  const ready = useMounted();

  const activeRef = useRef(true);
  useEffect(() => { activeRef.current = !paused; }, [paused]);

  // market tick
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeRef.current) return;
      setTickers((prev) => {
        const next = tickPrices(prev);
        setEquity((eq) => {
          const drift = (Math.random() - 0.48) * 0.004;
          const last = eq[eq.length - 1];
          return [...eq.slice(1), last * (1 + drift)];
        });
        setDailyPnl((d) => d + (Math.random() - 0.46) * 220);
        setWinRate((w) => Math.round(Math.min(72, Math.max(52, w + (Math.random() - 0.5) * 1.4))));
        setSharpe((s) => +(Math.min(2.8, Math.max(1.6, s + (Math.random() - 0.5) * 0.03)).toFixed(2)));
        setRisk((r) => ({
          ...r,
          score: Math.min(92, Math.max(35, r.score + Math.round((Math.random() - 0.5) * 6))),
          exposure: Math.min(99, Math.max(40, r.exposure + Math.round((Math.random() - 0.5) * 5))),
          var95: Math.min(80, Math.max(20, r.var95 + Math.round((Math.random() - 0.5) * 5))),
        }));
        setStrategyPnl((sp) => {
          const o = { ...sp };
          for (const k of Object.keys(o)) o[k] += (Math.random() - 0.46) * 90;
          return o;
        });
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // log + signal stream
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeRef.current) return;
      const [lv, tx] = pick(logPool);
      setLog((l) => [...l.slice(-40), makeLog(lv, tx)]);
      if (Math.random() > 0.5) {
        setTickers((t) => {
          const sym = pick(t).symbol;
          setSignals((s) => [makeSignal(sym), ...s].slice(0, 22));
          return t;
        });
      }
      setConfidence((c) => Math.round(Math.min(99, Math.max(55, c + (Math.random() - 0.5) * 6))));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // recompute derived KPIs
  const openPnl = useMemo(
    () =>
      positions.reduce((sum, p) => {
        const mark = tickers.find((t) => t.symbol === p.symbol)?.price ?? p.avg;
        return sum + positionPnl(p, mark).pnl;
      }, 0),
    [positions, tickers]
  );

  const k: KpiData = useMemo(
    () => ({
      portfolio: equity[equity.length - 1],
      dailyPnl,
      openPnl,
      winRate,
      sharpe,
      active,
      total: 6,
      equity,
    }),
    [equity, dailyPnl, openPnl, winRate, sharpe, active]
  );

  const featured = tickers[0];

  if (!ready) return <Splash />;

  return (
    <ConsoleShell
      tickers={tickers}
      mobileStrip={
        <div className="flex items-center justify-between border-b border-edge bg-surface/50 px-4 py-2 lg:hidden">
          <span className="text-[11px] text-slate-400">
            Portfolio <span className="font-mono text-slate-100">{usd(k.portfolio)}</span>
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className={[
              "rounded-md px-3 py-1 text-[11px] font-semibold ring-1 ",
              paused
                ? "bg-amber/15 text-amber ring-amber/40"
                : "bg-long/15 text-long ring-long/40",
            ].join(" ")}
          >
            {paused ? "Resume" : "Pause"} Engine
          </button>
        </div>
      }
    >
          <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Algorithmic Trading Console</h1>
              <p className="text-[12px] text-slate-500">
                Autonomous execution · {active} strategies live · AI agent managing {positions.length} positions
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setPaused((p) => !p)}
                className={[
                  "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ring-1 transition-colors ",
                  paused
                    ? "bg-amber/15 text-amber ring-amber/40 hover:bg-amber/25"
                    : "bg-long/15 text-long ring-long/40 hover:bg-long/25",
                ].join(" ")}
              >
                {paused ? "▶ Resume Engine" : "⏸ Pause Engine"}
              </button>
              <button className="rounded-lg border border-edge bg-surface-2/60 px-3.5 py-2 text-[12.5px] font-medium text-slate-200 transition-colors hover:border-edge-2">
                + New Strategy
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            <KpiStrip k={k} />

            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
              <div className="space-y-3.5 xl:col-span-8">
                <div className="rounded-xl border border-edge bg-surface/80 p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] h-[360px] flex flex-col">
                  <PriceChart tickers={tickers} />
                </div>

                <Positions positions={positions} tickers={tickers} />
              </div>

              <div className="space-y-3.5 xl:col-span-4">
                <AiAgent confidence={confidence} />
                <div className="h-[420px] flex flex-col">
                  <Signals signals={signals} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              <RiskPanel r={risk} />
              <Movers tickers={tickers} />
              <Strategies pnlOf={(name) => strategyPnl[name] ?? 0} />
            </div>

            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              <div className="lg:col-span-2" style={{ height: 260 }}>
                <Terminal log={log} />
              </div>
              <div style={{ height: 260 }}>
                <OrderBook ticker={featured} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3 text-[10.5px] text-slate-600">
            <span>NX-TRADING · nx-alpha 4.2 · build 2024.11 · demo data, not financial advice</span>
            <span className="font-mono">
              {pick(["ok", "ok", "warn"])} · {rand(1, 4).toFixed(0)}ms · 3/3 venues
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>related:</span>
            <Link href="/positions" className="text-accent-2 hover:underline">Positions</Link>
            <span>·</span>
            <Link href="/signals" className="text-accent-2 hover:underline">Signals</Link>
            <span>·</span>
            <Link href="/risk-lab" className="text-accent-2 hover:underline">Risk Lab</Link>
            <span>·</span>
            <Link href="/performance" className="text-accent-2 hover:underline">Performance</Link>
          </div>
    </ConsoleShell>
  );
}
