"use client";

import { useMemo } from "react";
import { Panel, Badge, LiveDot, Ring } from "./ui";
import { carryBpUSD, dxy, havenBias, MAJORS, pairPx, SWAP_PER_100K } from "../lib/fx";
import { EM_ETFS, SPLITS, usdMoveDollar } from "../lib/intl";

interface Tick {
  symbol: string;
  price: number;
  prev: number;
  change: number;
}

export function FxBoard({ tickers, riskOff }: { tickers: Tick[]; riskOff: boolean }) {
  const px = useMemo(() => Object.fromEntries(tickers.map((t) => [t.symbol, t.price])), [tickers]);
  const find = (s: string) => tickers.find((t) => t.symbol === s);
  return (
    <Panel accent title="FX majors" right={<LiveDot color="text-cyan" />}>
      <table className="w-full font-mono text-[11px]">
        <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-edge text-left">
            <th className="py-1">Pair</th>
            <th className="text-right">Bid</th>
            <th className="text-right">Ask</th>
            <th className="text-right">Chg</th>
            <th className="text-right">Carry (USD)</th>
            <th className="text-right">Swap /100k</th>
            <th className="text-right">Bias now</th>
          </tr>
        </thead>
        <tbody>
          {MAJORS.map((pair) => {
            const mid = pairPx(px, pair);
            const t = find(pair);
            const half = mid * 0.00012;
            const carry = carryBpUSD(pair);
            const hb = havenBias(pair, riskOff);
            return (
              <tr key={pair} className="border-b border-edge/40">
                <td className="py-1.5 font-medium text-slate-100">{pair}</td>
                <td className="text-right text-slate-300">{(mid - Number(half)).toFixed(pair === "USD/JPY" ? 3 : 5)}</td>
                <td className="text-right text-slate-300">{(mid + Number(half)).toFixed(pair === "USD/JPY" ? 3 : 5)}</td>
                <td className={`text-right ${(t?.change ?? 0) >= 0 ? "text-long" : "text-short"}`}>
                  {t && t.change != null ? `${t.change >= 0 ? "+" : ""}${t.change.toFixed(2)}%` : "—"}
                </td>
                <td className={`text-right ${carry.carry >= 0 ? "text-long" : "text-short"}`}>
                  {carry.carry >= 0 ? "+" : ""}
                  {carry.carry}bp
                </td>
                <td className="text-right text-slate-400">${SWAP_PER_100K[pair].toFixed(1)}</td>
                <td className="text-right">
                  <span className={`text-[10px] ${hb.dir === "+USD" ? "text-amber" : hb.dir === "-USD" ? "text-cyan" : "text-slate-500"}`}>
                    {hb.dir}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-[10.5px] text-slate-500">
        carry = long-USD earn rate (bp) · swap = overnight cost per 100k · bias = {riskOff ? "risk-OFF haven flows" : "risk-on drift"}
      </div>
    </Panel>
  );
}

export function DxyPanel({ tickers }: { tickers: Tick[] }) {
  const px = useMemo(() => Object.fromEntries(tickers.map((t) => [t.symbol, t.price])), [tickers]);
  const level = dxy(px);
  const pct = ((level - 96.0) / (108.0 - 96.0)) * 100; // 96..108 range
  const eur = findChg(tickers, "EUR/USD");
  const jpy = findChg(tickers, "USD/JPY");
  return (
    <Panel title="Dollar Index">
      <div className="flex items-center gap-3.5">
        <Ring value={pct} size={56} stroke={5} tone="text-amber">
          <div className="text-center">
            <div className="font-mono text-[13px] font-medium text-slate-100">{level}</div>
          </div>
        </Ring>
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">
            EUR/USD {eur >= 0 ? "+" : ""}{eur.toFixed(2)}% (57.6% weight)
          </div>
          <div className="text-[11px] text-slate-400">
            USD/JPY {jpy >= 0 ? "+" : ""}{jpy.toFixed(2)}% ({Math.round(13.6 * 10) / 10}% weight)
          </div>
          <div className="text-[10px] text-slate-600">NORD/SF legs proxied · live 4-leg math</div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-edge-2 bg-surface-2/40 px-3 py-2 text-[11px] text-slate-500">
        strong USD (&gt;105) = <span className="text-amber">headwind</span> for EM book · &lt;100 = tailwind
      </div>
    </Panel>
  );
}

function findChg(tickers: Tick[], sym: string): number {
  return tickers.find((t) => t.symbol === sym)?.change ?? 0;
}

export function CarryPanel() {
  const rows = MAJORS.map((pair) => ({ pair, ...carryBpUSD(pair) })).sort((a, b) => b.carry - a.carry);
  const max = Math.max(...rows.map((r) => Math.abs(r.carry)), 1);
  return (
    <Panel title="Carry ladder (long USD)">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.pair} className="flex items-center gap-2">
            <span className="w-20 font-mono text-[10.5px] text-slate-300">{r.pair}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${r.carry >= 0 ? "bg-long/70" : "bg-short/70"}`}
                style={{ width: `${(Math.abs(r.carry) / max) * 100}%` }}
              />
            </div>
            <span className={`w-14 text-right font-mono text-[10.5px] ${r.carry >= 0 ? "text-long" : "text-short"}`}>
              {r.carry >= 0 ? "+" : ""}
              {r.carry}bp
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10.5px] text-slate-500">
        policy-rate differentials — long USD earns the spread; the JPY carry is the classic short-fuse trade.
      </div>
    </Panel>
  );
}

export function IntlPage() {
  return (
    <div className="space-y-4">
      <Panel accent title="ADR vs local — the split you're missing">
        <table className="w-full font-mono text-[11px]">
          <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
            <tr className="border-b border-edge text-left">
              <th className="py-1">ADR</th>
              <th className="text-left">Local</th>
              <th className="text-right">CCY</th>
              <th className="text-right">ADR gap</th>
              <th className="text-right">Hedge cost/yr</th>
            </tr>
          </thead>
          <tbody>
            {SPLITS.map((s) => (
              <tr key={s.adr} className="border-b border-edge/40">
                <td className="py-1.5 text-slate-200">{s.adr}</td>
                <td className="text-slate-400">{s.local ?? "—"}</td>
                <td className="text-right text-slate-300">{s.ccy}</td>
                <td className={`text-right ${s.discountPct >= 0 ? "text-long" : "text-short"}`}>{s.discountPct > 0 ? "+" : ""}{s.discountPct}%</td>
                <td className="text-right text-amber">{s.hedgedCostPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="ai">hedge ≈ 2%/yr drag</Badge>
          <Badge tone="warn">ADR discount = arbitrage window</Badge>
        </div>
      </Panel>

      <Panel title="EM book — FX drag is not optional">
        <table className="w-full font-mono text-[11px]">
          <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
            <tr className="border-b border-edge text-left">
              <th className="py-1">ETF</th>
              <th className="text-right">β (US)</th>
              <th className="text-right">USD drag %</th>
              <th className="text-right">$ / 1M on 1% USD</th>
              <th className="text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {EM_ETFS.map((e) => (
              <tr key={e.sym} className="border-b border-edge/40">
                <td className="py-1.5 font-medium text-slate-100">{e.sym}</td>
                <td className="text-right text-slate-300">{e.betaUs.toFixed(2)}</td>
                <td className="text-right text-amber">{Math.round(e.fxExposure * 100)}%</td>
                <td className="text-right text-short">−${usdMoveDollar(1, e.fxExposure).toLocaleString()}</td>
                <td className="text-[10.5px] text-slate-500">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 rounded-lg border border-amber/25 bg-amber/6 px-3 py-2 text-[11px] text-slate-400">
          <span className="text-amber">drag math:</span> a 1% USD rally costs an unhedged Chinese ETF ~$340 per $1M
          — the AI brain sizes EM against the DXY, not against US beta alone.
        </div>
      </Panel>
    </div>
  );
}
