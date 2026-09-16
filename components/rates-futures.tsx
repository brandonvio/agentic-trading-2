"use client";

import { useMemo, useState } from "react";
import { Panel, Badge } from "./ui";
import { ladders, rollInfo, spreads, VENUES, type LadderRow } from "../lib/futures";
import { dv01, notionalForDV01, twoTen, yieldCurve } from "../lib/rates";

const usd = (n: number) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${n.toFixed(0)}`;

export function Ladders({ now }: { now: number }) {
  const groups = useMemo(() => ladders(now), [now]);
  const [active, setActive] = useState("ES");
  const g = groups.find((x) => x.symbol === active) ?? groups[0];
  return (
    <Panel accent title="Contract ladders" right={<span className="font-mono text-[10px] text-slate-500">CME · simulated</span>}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {groups.map((x) => (
          <button
            key={x.symbol}
            onClick={() => setActive(x.symbol)}
            className={`rounded-md px-2 py-1 font-mono text-[10.5px] ring-1 transition-colors ${
              x.symbol === g.symbol ? "bg-accent/15 text-accent-2 ring-accent/40" : "text-slate-400 ring-edge hover:text-slate-200"
            }`}
          >
            {x.symbol}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1" />
        {g.rows.map((r) => (
          <div key={r.m} className="md:hidden" />
        ))}
        <table className="w-full font-mono text-[11px]">
          <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
            <tr className="border-b border-edge text-left">
              <th className="py-1">Month</th>
              <th className="text-right">Settle</th>
              <th className="text-right">OI</th>
              <th className="text-right">Δ Prompt</th>
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r: LadderRow) => (
              <tr key={r.m} className="border-b border-edge/40">
                <td className={`py-1.5 ${r.prompt ? "text-accent-2" : "text-slate-300"}`}>
                  {r.label} {r.prompt && <span className="ml-1 rounded bg-accent/15 px-1 text-[9px] text-accent-2">FRONT</span>}
                </td>
                <td className="text-right text-slate-200">{r.px}</td>
                <td className="text-right text-slate-400">{(r.oi / 1000).toFixed(0)}k</td>
                <td className="text-right text-slate-400">{r.m === 0 ? "—" : `${(r.px - g.rows[0].px >= 0 ? "+" : "")}${(r.px - g.rows[0].px).toFixed(2)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px]">
        <div className="rounded-lg border border-edge-2 bg-surface-2/50 p-2">
          <div className="text-slate-600">multiplier</div>
          <div className="text-slate-200">× {g.multiplier}</div>
        </div>
        <div className="rounded-lg border border-edge-2 bg-surface-2/50 p-2">
          <div className="text-slate-600">$/tick</div>
          <div className="text-slate-200">{g.tickValue < 1 ? `$${(g.tickValue).toFixed(2)}` : `$${g.tickValue}`}</div>
        </div>
        <div className="rounded-lg border border-edge-2 bg-surface-2/50 p-2">
          <div className="text-slate-600">initial margin</div>
          <div className="text-slate-200">{usd(g.margin)}</div>
        </div>
      </div>
    </Panel>
  );
}

export function SpreadsPanel({ now }: { now: number }) {
  const rows = useMemo(() => spreads(now), [now]);
  return (
    <Panel title="Futures curves (front vs 2nd)" >
      <table className="w-full font-mono text-[11px]">
        <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-edge text-left">
            <th className="py-1">Contract</th>
            <th className="text-right">Front</th>
            <th className="text-right">2nd</th>
            <th className="text-right">Δ pts</th>
            <th className="text-right">Δ $</th>
            <th className="text-right">Shape</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="border-b border-edge/40">
              <td className="py-1 text-slate-200">{r.symbol}</td>
              <td className="text-right text-slate-300">{r.front}</td>
              <td className="text-right text-slate-300">{r.second}</td>
              <td className="text-right text-slate-300">{r.diffPts >= 0 ? "+" : ""}{r.diffPts}</td>
              <td className={`text-right ${r.diffDollars >= 0 ? "text-long" : "text-short"}`}>{r.diffDollars >= 0 ? "+" : ""}${Math.abs(r.diffDollars).toLocaleString()}</td>
              <td className="text-right">
                <Badge tone={r.kind === "contango" ? "long" : "warn"}>{r.kind}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10.5px] text-slate-500">
        carry chains: energy backwardated (spot premium) · equity index &amp; bonds in contango
      </div>
    </Panel>
  );
}

export function RollPanel({ now }: { now: number }) {
  const r = rollInfo(now);
  return (
    <Panel title="Roll discipline" accent>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10.5px] text-slate-500">roll window</div>
          <div className="font-mono text-[16px] text-slate-200">{r.nextRollLabel}</div>
        </div>
        <Badge tone={r.inWindow ? "ok" : "muted"}>{r.inWindow ? "IN WINDOW" : `${r.daysToWindow}d out`}</Badge>
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Roll front→2nd during the window week (2nd-Friday week). Auto-roll orders are pre-created as
        <span className="text-slate-300"> spread-bracket</span> legs so the position never goes naked.
      </div>
      <div className="mt-3 space-y-1.5">
        {VENUES.map((v) => (
          <div key={v.name} className="flex items-center justify-between rounded-lg border border-edge-2 bg-surface-2/40 px-2.5 py-1.5">
            <span className="text-[11px] text-slate-300">{v.name}</span>
            <span className={`font-mono text-[10px] ${v.available ? "text-long" : "text-short"}`}>{v.available ? "routing ✓" : "RFQ only"}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CurveSVG({ bp2, bp30 }: { bp2: number; bp30: number }) {
  const c = yieldCurve(bp2, bp30);
  const lo = Math.min(...c.map((p) => p.yield)) - 0.1;
  const hi = Math.max(...c.map((p) => p.yield)) + 0.1;
  const W = 100;
  const H = 62;
  const xs = [0.083, 0.25, 0.5, 1, 2, 5, 10, 30];
  const px = (yrs: number) => 4 + (Math.log10(yrs / 0.083) / Math.log10(30 / 0.083)) * (W - 8);
  const py = (y: number) => H - 8 - ((y - lo) / (hi - lo)) * (H - 16);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[170px] w-full" preserveAspectRatio="none">
        {[0.2, 0.5, 0.8].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="stroke-edge" strokeWidth={0.3} />
        ))}
        <polyline points={c.map((p) => `${px(p.yrs)},${py(p.yield)}`).join(" ")} fill="none" stroke="#53e6c2" strokeWidth={1} />
        {xs.map((x) => (
          <line key={x} x1={px(x)} x2={px(x)} y1={H - 8} y2={H - 5.5} className="stroke-edge-2" strokeWidth={0.4} />
        ))}
      </svg>
      <div className="flex justify-between px-1 font-mono text-[9.5px] text-slate-500">
        {c.map((p) => (
          <span key={p.label} className="text-center">
            {p.label}
            <span className="block text-slate-300">{p.yield.toFixed(2)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function RatesBoard({ now }: { now: number }) {
  void now;
  const [bp2, setBp2] = useState(0);
  const [bp30, setBp30] = useState(0);
  const curve = useMemo(() => yieldCurve(bp2, bp30), [bp2, bp30]);
  const tt = twoTen(bp2, bp30);
  const NOT = 1_000_000;
  return (
    <Panel accent title="Yield curve · DV01 · scenarios" right={<span className="font-mono text-[10px] text-slate-500">$1M per tenor</span>}>
      <CurveSVG bp2={bp2} bp30={bp30} />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          2y shift
          <input type="range" min={-50} max={100} value={bp2} onChange={(e) => setBp2(Number(e.target.value))} className="w-28 accent-[#53e6c2]" />
          <span className="w-12 text-slate-300">{bp2 >= 0 ? "+" : ""}{bp2}bp</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          30y shift
          <input type="range" min={-50} max={100} value={bp30} onChange={(e) => setBp30(Number(e.target.value))} className="w-28 accent-[#53e6c2]" />
          <span className="w-12 text-slate-300">{bp30 >= 0 ? "+" : ""}{bp30}bp</span>
        </label>
        {bp2 !== 0 || bp30 !== 0 ? (
          <button onClick={() => { setBp2(0); setBp30(0); }} className="rounded-md px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-edge hover:text-slate-200">
            reset
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-slate-500">2s10s</span>
        <span className={`font-mono text-[16px] ${tt.inverted ? "text-short" : "text-long"}`}>{tt.label}</span>
        {tt.inverted && <Badge tone="warn">curve inverted — recession signal historically precedes</Badge>}
      </div>
      <table className="mt-3 w-full font-mono text-[11px]">
        <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-edge text-left">
            <th className="py-1">Curve</th>
            <th className="text-right">Yield</th>
            <th className="text-right">Dur</th>
            <th className="text-right">DV01 ($/bp)</th>
          </tr>
        </thead>
        <tbody>
          {curve.map((p) => (
            <tr key={p.label} className="border-b border-edge/40">
              <td className="py-1 text-slate-200">{p.label}s</td>
              <td className="text-right text-slate-300">{p.yield.toFixed(2)}%</td>
              <td className="text-right text-slate-400">{p.duration.toFixed(2)}</td>
              <td className="text-right text-cyan">{usd(dv01(NOT, p.duration))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px]">
        <div className="rounded-lg border border-edge-2 bg-surface-2/50 p-2">
          <div className="text-slate-600">duration-neutral pair size</div>
          <div className="text-slate-200">2y long {usd(notionalForDV01(dv01(NOT, 7.99), 1.96))} / 10y short {usd(NOT)}</div>
        </div>
        <div className="rounded-lg border border-edge-2 bg-surface-2/50 p-2">
          <div className="text-slate-600">portfolio DV01 (all tenors)</div>
          <div className="text-slate-200">{usd(curve.reduce((a, p) => a + dv01(NOT, p.duration), 0) * 100)}</div>
        </div>
      </div>
    </Panel>
  );
}
