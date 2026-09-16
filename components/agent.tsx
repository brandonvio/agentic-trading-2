import { Panel, Ring } from "./ui";
import { fmtAgentAge, type AgentStep, type StepKind } from "../lib/agent";

const KIND_META: Record<StepKind, { icon: string; chip: string; label: string }> = {
  thought: { icon: "◌", chip: "bg-accent/12 text-accent-2 ring-accent/35", label: "THOUGHT" },
  tool: { icon: "⌘", chip: "bg-cyan/12 text-cyan ring-cyan/35", label: "TOOL" },
  observe: { icon: "◉", chip: "bg-slate-500/15 text-slate-300 ring-slate-500/40", label: "OBSERVE" },
  decision: { icon: "✦", chip: "bg-long/12 text-long ring-long/35", label: "DECISION" },
};

export function StepRow({ s }: { s: AgentStep }) {
  const m = KIND_META[s.kind];
  return (
    <li className="flex items-start gap-2.5 px-4 py-2">
      <span className={`mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-md font-mono text-[9.5px] font-semibold tracking-wider ring-1 ${m.chip}`}>
        {m.icon} {m.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-snug text-slate-300">{s.text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-600">
          <span>{fmtAgentAge(s.tsAgoSec)}</span>
          {s.tool && <span className="rounded bg-slate-800/80 px-1 py-px text-slate-500">{s.tool}()</span>}
          {s.ms !== undefined && <span>{s.ms}ms</span>}
          {s.tokens !== undefined && <span>{s.tokens} tok</span>}
        </div>
      </div>
    </li>
  );
}

// ---------- confidence ----------

export function ConfidenceRing({ value, prev }: { value: number; prev: number }) {
  const d = value - prev;
  const tone = d > 0 ? "text-long" : d < 0 ? "text-short" : "text-slate-400";
  const ring = value >= 85 ? "var(--color-long)" : value >= 70 ? "var(--color-amber)" : "var(--color-short)";
  return (
    <Panel title="Confidence" icon={<>◔</>} right={<span className={`font-mono text-[11px] ${tone}`}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}pt</span>}>
      <div className="flex items-center justify-center py-2">
        <Ring value={value} tone={ring} size={116} stroke={10}>
          <div className="text-center">
            <div className="font-mono text-[22px] font-semibold tabular-nums text-slate-50">{value}%</div>
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500">model conf</div>
          </div>
        </Ring>
      </div>
      <p className="px-1 text-center text-[10.5px] leading-relaxed text-slate-500">
        Rolling blend of signal quality, fill behavior, and guardrail headroom. Drifts ±3pt per tick.
      </p>
    </Panel>
  );
}

// ---------- guardrails ----------

const GUARDRAILS: { label: string; value: string; state: "ok" | "warn" }[] = [
  { label: "Max drawdown", value: "4.2% / 8% cap", state: "ok" },
  { label: "Per-trade cap", value: "$18.5k / $25k", state: "ok" },
  { label: "Venue whitelist", value: "OKX · BINANCE · COINBASE", state: "ok" },
  { label: "Kill switch", value: "armed · auto after 2 breaches", state: "ok" },
  { label: "Model drift", value: "1.6σ — watch level", state: "warn" },
];

export function GuardrailsPanel() {
  return (
    <Panel title="Guardrails" icon={<>⛨</>} right={<span className="font-mono text-[10.5px] text-slate-500">4/5 OK · 1 WATCH</span>}>
      <ul className="divide-y divide-edge/50">
        {GUARDRAILS.map((g) => (
          <li key={g.label} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-[11.5px] text-slate-400">{g.label}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-[11px] text-slate-300">{g.value}</span>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${g.state === "ok" ? "bg-long" : "bg-amber"}`} />
            </span>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] leading-relaxed text-slate-600">
        Any breach pauses the agent, flattens exposure, and pages the desk.
      </p>
    </Panel>
  );
}

// ---------- telemetry ----------

export function Telemetry({
  tokensTotal,
  lastMs,
  uptimeSec,
}: {
  tokensTotal: number;
  lastMs: number;
  uptimeSec: number;
}) {
  const up =
    uptimeSec >= 3_600
      ? `${Math.floor(uptimeSec / 3_600)}h ${Math.floor((uptimeSec % 3_600) / 60)}m`
      : `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`;
  const rows: [string, string][] = [
    ["Model", "nx-desk-1 · 8B"],
    ["Tokens (session)", tokensTotal.toLocaleString()],
    ["Last tool latency", `${lastMs}ms`],
    ["Tokens/s (avg)", (12 + (tokensTotal % 9)).toFixed(1)],
    ["Uptime", up],
  ];
  return (
    <Panel title="Telemetry" icon={<>⌁</>} right={<span className="font-mono text-[10.5px] text-slate-500">local · vLLM</span>}>
      <dl className="divide-y divide-edge/50">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-4 py-1.5">
            <dt className="text-[11px] text-slate-500">{k}</dt>
            <dd className="font-mono text-[11px] tabular-nums text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
