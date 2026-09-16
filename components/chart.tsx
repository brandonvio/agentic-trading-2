import { useState } from "react";
import type { Ticker } from "../lib/market";
import { meta } from "../lib/instruments";
import { Delta, Badge } from "./ui";

const RANGES = ["1H", "4H", "1D", "1W", "1M"] as const;

function buildArea(data: number[], w: number, h: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = w / (data.length - 1);
  const y = (v: number) => h - ((v - min) / span) * (h - 8) - 4;
  const line = data.map((d, i) => `${(i * stepX).toFixed(1)},${y(d).toFixed(1)}`).join(" ");
  return { line, area: `0,${h} ${line} ${w},${h}`, min, max, y };
}

export function PriceChart({ tickers }: { tickers: Ticker[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1D");
  const sym = tickers[0].symbol;
  const t = tickers.find((x) => x.symbol === sym) ?? tickers[0];

  const W = 760;
  const H = 240;
  const { line, area, min, max, y } = buildArea(t.history, W, H);
  const up = t.change >= 0;
  const tone = up ? "var(--color-long)" : "var(--color-short)";
  const curY = y(t.price);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight">{t.symbol}</span>
              <Badge tone={t.symbol.includes("-USD") ? "ok" : "neutral"}>
                {t.symbol.includes("-USD") ? "CRYPTO" : "EQUITY"}
              </Badge>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">{t.name}</div>
          </div>
          <div className="ml-1">
            <div className="font-mono text-xl font-semibold tabular-nums">
              {t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2">
              <Delta value={t.change} />
              <span className="text-[10.5px] text-slate-500">session</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-edge bg-surface-2/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors " +
                (range === r
                  ? "bg-accent/20 text-accent-2 ring-1 ring-accent/40"
                  : "text-slate-400 hover:text-slate-100")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* symbol switcher chips */}
        <svg
          viewBox={`0 0 ${W} ${H + 64}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.30" />
              <stop offset="100%" stopColor={tone} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,0.045)" strokeDasharray="3 5" />
          ))}

          <polygon points={area} fill="url(#chartArea)" />
          <polyline points={line} fill="none" stroke={tone} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />

          {/* current price marker */}
          <line x1="0" y1={curY} x2={W} y2={curY} stroke={tone} strokeOpacity="0.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <circle cx={W} cy={curY} r="3.4" fill={tone} />

          {/* volume bars (deterministic) */}
          {t.history
            .slice(-48)
            .map((v, i, arr) => {
              const spanX = W / (47);
              const vH = ((v - min) / (max - min || 1)) * 42 + 6;
              const vx = (i / (arr.length - 1)) * (W - spanX);
              const volUp = i % 3 !== 0;
              return (
                <rect
                  key={i}
                  x={vx}
                  y={H + 18 + (64 - 18 - vH)}
                  width={spanX * 0.6}
                  height={vH}
                  rx="1"
                  fill={volUp ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)"}
                />
              );
            })}
        </svg>

        {/* price axis labels */}
        <div className="pointer-events-none absolute right-1 top-0 flex h-[78%] flex-col justify-between font-mono text-[9.5px] text-slate-500">
          <span>{max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          <span>{((max + min) / 2).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          <span>{min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
        </div>
        <div
          className="absolute right-0 -translate-y-1/2 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-white ring-1 ring-edge"
          style={{ top: `${(t.history.length ? (curY / (H + 64)) * 100 : 50)}%` }}
        >
          {t.price.toLocaleString()}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-edge pt-2 text-[10.5px] text-slate-500">
        <span>σ · ±{(meta(t.symbol).vol * 100).toFixed(2)}%/tick</span>
        <span>Range · {min.toFixed(0)} – {max.toFixed(0)}</span>
        <span className="flex items-center gap-2">
          <span className="text-long">▲ buy</span>
          <span className="text-short">▼ sell</span>
        </span>
      </div>
    </div>
  );
}
