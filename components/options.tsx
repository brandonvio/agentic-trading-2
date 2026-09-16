"use client";

import { Panel, Badge, Sparkline } from "./ui";
import {
  buildStrategy,
  gammaOf,
  ivCurve,
  maxPain,
  pnlCurve,
  type ChainRow,
  type StrategyPlan,
} from "../lib/options";

const usd = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

const MONEYS = Array.from({ length: 13 }, (_, i) => 0.85 + (0.3 * i) / 12);

function LineChart({
  series,
  xLabel,
  h = 110,
}: {
  series: { label: string; color: string; values: number[]; dash?: string }[];
  xLabel: (label?: string) => string;
  h?: number;
}) {
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(...all) * 0.98;
  const hi = Math.max(...all) * 1.02;
  const W = 100;
  const px = (i: number, n: number) => (i / (n - 1)) * W;
  const py = (v: number) => h - ((v - lo) / (hi - lo || 1)) * (h - 16) - 8;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${h}`} className="h-[120px] w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={h * f} y2={h * f} className="stroke-edge" strokeWidth={0.3} />
        ))}
        {series.map((s) => (
          <polyline
            key={s.label}
            points={s.values.map((v, i) => `${px(i, s.values.length)},${py(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={0.9}
            strokeDasharray={s.dash}
          />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span className="h-[3px] w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-slate-600">{xLabel()}</span>
      </div>
    </div>
  );
}

export function IVSurfacePanel({ symbol, dtes }: { symbol: string; dtes: number[] }) {
  const colors = ["#53e6c2", "#22d3ee", "#8b93ff"];
  return (
    <Panel title="IV surface — skew × term structure" accent right={<span className="font-mono text-[10px] text-slate-500">{symbol}</span>}>
      <LineChart
        series={dtes.map((d, i) => ({
          label: `${d}d`,
          color: colors[i % 3],
          dash: i > 1 ? "2 2" : undefined,
          values: ivCurve(symbol, d, MONEYS),
        }))}
        xLabel={() => "moneyness 0.85 (puts) → 1.15 (calls)"}
      />
      <div className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
        put wing richer than the call wing (skew) · near-dated vol trades up (term structure)
      </div>
    </Panel>
  );
}

export function ChainBoard({ rows }: { rows: ChainRow[] }) {
  const atmK = Math.round(rows.reduce((a, r) => a + r.strike, 0) / rows.length);
  return (
    <Panel title="Option chain (30d unless noted)" accent right={<span className="font-mono text-[10px] text-slate-500">{rows.length} rows</span>}>
      <div className="overflow-auto max-h-[430px] -mx-1 px-1">
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
            <tr className="border-b border-edge">
              <th className="py-1 pr-2">Type</th>
              <th className="px-2">Strike</th>
              <th className="px-2 text-right">Bid</th>
              <th className="px-2 text-right">Ask</th>
              <th className="px-2 text-right">IV%</th>
              <th className="px-2 text-right">Δ</th>
              <th className="px-2 text-right">γ</th>
              <th className="px-2 text-right">Vega</th>
              <th className="px-2 text-right">Theta</th>
              <th className="px-2 text-right">OI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isATM = Math.abs(r.strike - atmK) <= (rows[1]?.strike || 0);
              return (
                <tr key={r.type + r.strike} className={`border-b border-edge/40 ${isATM ? "bg-accent/5" : ""}`}>
                  <td className={`py-1 pr-2 ${r.type === "C" ? "text-long" : "text-short"}`}>{r.type}</td>
                  <td className="px-2 text-slate-200">{r.strike}</td>
                  <td className="px-2 text-right text-slate-300">{r.bid.toFixed(2)}</td>
                  <td className="px-2 text-right text-slate-300">{r.ask.toFixed(2)}</td>
                  <td className="px-2 text-right text-slate-300">{r.iv.toFixed(1)}</td>
                  <td className={`px-2 text-right ${r.g.delta >= 0 ? "text-long" : "text-short"}`}>{(r.g.delta * 100).toFixed(0)}</td>
                  <td className="px-2 text-right text-cyan">{(r.g.gamma * 100).toFixed(1)}</td>
                  <td className="px-2 text-right text-slate-300">{r.g.vega.toFixed(1)}</td>
                  <td className="px-2 text-right text-amber">{r.g.theta.toFixed(2)}</td>
                  <td className="px-2 text-right text-slate-400">{usd(r.openInterest)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function MaxPainPanel({ rows, spot }: { rows: ChainRow[]; spot: number }) {
  const mp = maxPain(rows);
  const strikes = [...new Set(rows.map((r) => r.strike))].sort((a, b) => a - b);
  const maxOI = Math.max(...strikes.map((K) => rows.filter((r) => r.strike === K).reduce((a, r) => a + r.openInterest, 0)));
  const W = 100;
  const bw = W / strikes.length;
  return (
    <Panel title="Max pain & OI" accent>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10.5px] text-slate-500">max pain</div>
          <div className="font-mono text-[17px] text-amber">{mp.strike}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10.5px] text-slate-500">spot</div>
          <div className="font-mono text-[17px] text-slate-200">{spot.toFixed(2)}</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} 52`} className="mt-2 h-[110px] w-full" preserveAspectRatio="none">
        {strikes.map((K, i) => {
          const oi = rows.filter((r) => r.strike === K).reduce((a, r) => a + r.openInterest, 0);
          const hgt = (oi / maxOI) * 42;
          const isMP = K === mp.strike;
          const isSpot = K === strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a));
          return (
            <g key={K}>
              <rect x={i * bw + 1} y={50 - hgt} width={bw - 2} height={hgt} className={isMP ? "fill-amber/70" : "fill-slate-500/40"} />
              {isSpot && <line x1={i * bw + bw / 2} x2={i * bw + bw / 2} y1={2} y2={50} stroke="#53e6c2" strokeWidth={0.8} strokeDasharray="2 2" />}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={50} y2={50} className="stroke-edge" strokeWidth={0.4} />
      </svg>
      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 bg-amber/70" /> max pain</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 bg-long" /> spot</span>
      </div>
    </Panel>
  );
}

export function GexPanel({ rows, spot }: { rows: ChainRow[]; spot: number }) {
  const { perStrike, net, flip } = gammaOf(rows, spot);
  const maxG = Math.max(...perStrike.map((p) => Math.abs(p.gamma)), 1);
  return (
    <Panel title="Gamma exposure" accent>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10.5px] text-slate-500">net gamma</div>
          <div className={`font-mono text-[17px] ${net >= 0 ? "text-long" : "text-short"}`}>
            {net >= 0 ? "L" : "S"} {Math.abs(net / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10.5px] text-slate-500">flip level</div>
          <div className="font-mono text-[17px] text-cyan">{flip.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-3 flex h-[90px] items-end gap-[3px]">
        {perStrike.map((p) => (
          <div
            key={p.K}
            title={`${p.K} · γ ${p.gamma.toFixed(0)}`}
            className={`flex-1 rounded-sm ${p.gamma >= 0 ? "bg-long/70" : "bg-short/70"}`}
            style={{ height: `${Math.max(6, (Math.abs(p.gamma) / maxG) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-slate-500">
        bars = per-strike dealer gamma · below flip → flow amplifies moves
      </div>
    </Panel>
  );
}

function PlanCard({ plan, symbol, spot, dte }: { plan: StrategyPlan; symbol: string; spot: number; dte: number }) {
  const curve = pnlCurve(plan, symbol, spot, dte);
  const lo = Math.min(...curve, 0);
  const hi = Math.max(...curve, 0);
  const W = 100;
  const px = (i: number) => (i / (curve.length - 1)) * W;
  const py = (v: number) => 46 - ((v - lo) / (hi - lo || 1)) * 40 - 3;
  const spotIdx = Math.round(0.6667 * (curve.length - 1));
  return (
    <div className="rounded-xl border border-edge-2 bg-surface-2/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-200">{plan.name}</div>
        <Badge tone={plan.premium >= 0 ? "long" : "short"}>
          {plan.premium >= 0 ? `credit ${plan.premium.toFixed(2)}` : `debit ${(-plan.premium).toFixed(2)}`}
        </Badge>
      </div>
      <svg viewBox={`0 0 ${W} 49`} className="mt-2 h-[105px] w-full" preserveAspectRatio="none">
        <line x1={0} x2={W} y1={py(0)} y2={py(0)} className="stroke-edge" strokeWidth={0.5} />
        <polyline points={curve.map((v, i) => `${px(i)},${py(v)}`).join(" ")} fill="none" stroke="#53e6c2" strokeWidth={0.9} />
        <line x1={px(spotIdx)} x2={px(spotIdx)} y1={2} y2={47} stroke="#22d3ee" strokeWidth={0.5} strokeDasharray="2 2" />
      </svg>
      <div className="mt-1.5 grid grid-cols-3 gap-1 font-mono text-[10px]">
        <div>
          <div className="text-slate-600">max profit</div>
          <div className="text-long">{plan.maxProfit === Infinity ? "∞" : `+${plan.maxProfit.toFixed(2)}`}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-600">max loss</div>
          <div className="text-short">−{plan.maxLoss.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-slate-600">breakevens</div>
          <div className="text-cyan">{plan.breakevens.map((b) => b.toFixed(0)).join(" / ")}</div>
        </div>
      </div>
      <div className="mt-1.5 text-[10.5px] leading-snug text-slate-500">{plan.notes}</div>
    </div>
  );
}

export function StrategyLab({ symbol, spot, dte }: { symbol: string; spot: number; dte: number }) {
  const plans: StrategyPlan[] = ["vertical", "straddle", "ironCondor", "calendar"].map((id) =>
    buildStrategy(id as StrategyPlan["id"], symbol, spot, dte)
  );
  return (
    <Panel title="Strategy studio — P&L at expiry" accent right={<span className="font-mono text-[10px] text-slate-500">{symbol} · {dte}d</span>}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} symbol={symbol} spot={spot} dte={dte} />
        ))}
      </div>
      <div className="mt-2 text-[10.5px] text-slate-500">
        100-share units · prices from the live deterministic IV surface · curve = payoff at expiry (calendar spread-valued at near expiry)
      </div>
      <div className="mt-1"><Sparkline data={plans.map((p) => p.premium)} w={90} h={16} /></div>
    </Panel>
  );
}
