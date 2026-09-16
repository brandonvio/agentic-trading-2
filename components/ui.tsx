import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  right,
  children,
  className = "",
  accent,
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section
      className={[
        "relative flex flex-col rounded-xl border",
        "border-edge bg-surface/80 backdrop-blur px-4 py-3.5",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_40px_-30px_rgba(0,0,0,0.9)]",
        accent && "border-accent/30",
        className,
      ].join(" ")}
    >
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-accent-2">{icon}</span>}
            {title && (
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300/90">
                {title}
              </h2>
            )}
          </div>
          {right}
        </header>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function LiveDot({ color = "var(--color-long)" }: { color?: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className="pulse-dot absolute inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <span
        className="inline-flex h-2 w-2 rounded-full opacity-70"
        style={{ background: color }}
      />
    </span>
  );
}

const toneMap = {
  up: "text-long",
  down: "text-short",
  flat: "text-slate-300",
  accent: "text-accent-2",
  warn: "text-amber",
} as const;

export function Delta({
  value,
  suffix = "%",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const tone = value > 0.001 ? "up" : value < -0.001 ? "down" : "flat";
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className={`font-mono tabular-nums ${toneMap[tone]} ${className}`}
    >
      {sign}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "long" | "short" | "ai" | "warn" | "ok" | "muted";
}) {
  const styles: Record<string, string> = {
    neutral: "bg-slate-800/70 text-slate-300 border-slate-700/60",
    long: "bg-long/12 text-long border-long/30",
    short: "bg-short/12 text-short border-short/30",
    ai: "bg-accent/15 text-accent-2 border-accent/40",
    warn: "bg-amber/12 text-amber border-amber/30",
    ok: "bg-cyan/12 text-cyan border-cyan/30",
    muted: "bg-slate-900 text-slate-500 border-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none uppercase tracking-wide ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function Sparkline({
  data,
  tone = "var(--color-accent)",
  w = 120,
  h = 36,
  className = "",
}: {
  data: number[];
  tone?: string;
  w?: number;
  h?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((d, i) => [i * step, h - ((d - min) / span) * (h - 4) - 2]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const id = `g${tone.replace(/[^a-z0-9]/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      width={w}
      height={h}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={tone}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Ring({
  value,
  size = 74,
  stroke = 7,
  tone = "var(--color-accent)",
  children,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      {children && <span className="absolute inset-0 flex flex-col items-center justify-center">{children}</span>}
    </div>
  );
}
