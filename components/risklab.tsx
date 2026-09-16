import { Panel, Ring } from "./ui";
import {
  DIMENSIONS,
  bandColor,
  bandLabel,
  type Scenario,
  type StressedLimit,
  type VaCvar,
} from "../lib/risklab";

// ---------- gauges ----------

function gaugeTone(pct: number): string {
  if (pct >= 100) return "var(--color-short)";
  if (pct >= 80) return "var(--color-amber)";
  return "var(--color-long)";
}

const K = 1000;
function fmtVal(v: number, unit: string): string {
  if (unit === "k$") return `$${Math.round(v / K).toLocaleString()}k`;
  if (unit === "%") return `${v}%`;
  return `${v}`;
}

export function LimitGauges({
  limits,
  activeScenario,
}: {
  limits: StressedLimit[];
  activeScenario: Scenario | null;
}) {
  return (
    <Panel
      title="Limit utilization"
      icon={<>⌀</>}
      right={
        activeScenario ? (
          <span className="rounded-md bg-short/15 px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-short ring-1 ring-short/40">
            STRESSED · {activeScenario.name.toUpperCase()}
          </span>
        ) : (
          <span className="font-mono text-[10.5px] text-slate-500">live · 5m refresh</span>
        )
      }
      className="h-full"
    >
      <ul className="divide-y divide-edge/50">
        {limits.map((l) => {
          const stressed = activeScenario !== null;
          const shown = stressed ? l.stressedPct : l.pct;
          const band =
            shown >= 100
              ? { chip: "bg-short/15 text-short ring-short/40", text: "BREACH" }
              : shown >= 80
                ? { chip: "bg-amber/15 text-amber ring-amber/40", text: "HIGH" }
                : { chip: "bg-long/12 text-long ring-long/30", text: "OK" };
          return (
            <li key={l.name} className="flex items-center gap-3 px-4 py-2.5">
              <Ring value={Math.min(100, shown)} tone={gaugeTone(shown)} size={46} stroke={4.5}>
                <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-200">{Math.round(shown)}</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-slate-200">{l.name}</div>
                <div className="font-mono text-[10.5px] tabular-nums text-slate-500">
                  {fmtVal(l.used, l.unit)} / {fmtVal(l.limit, l.unit)}
                  {stressed && l.delta > 0 && (
                    <span className="ml-1.5 text-short">+{l.delta}pt</span>
                  )}
                  {stressed && l.delta === 0 && <span className="ml-1.5 text-slate-700">±0</span>}
                </div>
              </div>
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-wider ring-1 ${band.chip}`}>
                {band.text}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------- VaR / CVaR ----------

function usd(v: number) {
  return `$${Math.round(v / 1000).toLocaleString()}k`;
}

export function VaCvarPanel({ vc, varImpact }: { vc: VaCvar; varImpact: number | null }) {
  const tiles: { label: string; value: number; sub?: string; tone: "neg" | "neu" }[] = [
    { label: "VaR 95 · 1d", value: vc.var95_1d, tone: "neg" },
    { label: "VaR 99 · 1d", value: vc.var99_1d, tone: "neg" },
    { label: "VaR 95 · 10d", value: vc.var95_10d, tone: "neg" },
    { label: "CVaR 95 · 1d", value: vc.cvar95_1d, tone: "neg" },
  ];
  return (
    <Panel
      title="Value at risk"
      icon={<>∿</>}
      right={
        varImpact !== null ? (
          <span className="font-mono text-[10.5px] text-short">+{usd(varImpact)} stressed</span>
        ) : (
          <span className="font-mono text-[10.5px] text-slate-500">512 daily obs</span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-edge bg-surface-2/40 px-3 py-2.5">
            <div className="text-[9.5px] uppercase tracking-[0.1em] text-slate-500">{t.label}</div>
            <div className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-short">{usd(t.value)}</div>
            {t.label === "VaR 95 · 1d" && varImpact !== null && (
              <div className="mt-0.5 font-mono text-[10px] text-short">
                {usd(t.value + varImpact)} under scenario
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 text-[10.5px] leading-relaxed text-slate-600">
        Historical quantiles over 512 simulated daily P&L observations, scaled to equity. CVaR = mean of the worst 5%.
      </p>
    </Panel>
  );
}

// ---------- scenario table ----------

const SEV_META: Record<number, { label: string; dot: string }> = {
  1: { label: "L1", dot: "bg-long" },
  2: { label: "L2", dot: "bg-amber" },
  3: { label: "L3", dot: "bg-short" },
  4: { label: "L4", dot: "bg-short animate-pulse" },
};

export function ScenarioTable({
  scenarios,
  selectedId,
  activeId,
  onSelect,
  onApply,
  onReset,
}: {
  scenarios: Scenario[];
  selectedId: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onApply: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <Panel
      title="Scenario table"
      icon={<>⚡</>}
      right={
        activeId ? (
          <button onClick={onReset} className="rounded-md border border-short/40 bg-short/10 px-2 py-0.5 font-mono text-[10.5px] text-short transition hover:bg-short/20">
            RESET STRESS
          </button>
        ) : (
          <span className="font-mono text-[10.5px] text-slate-500">{scenarios.length} scenarios</span>
        )
      }
      className="h-full"
    >
      <ul className="divide-y divide-edge/50">
        {scenarios.map((s) => {
          const sev = SEV_META[s.severity];
          const isSel = s.id === selectedId;
          const isActive = s.id === activeId;
          return (
            <li
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                isSel ? "bg-accent/10 ring-1 ring-inset ring-accent/35" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${sev.dot}`} />
              <span className="w-8 shrink-0 font-mono text-[10px] font-semibold tracking-wider text-slate-500">{sev.label}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-slate-200">{s.name}</div>
                <div className="font-mono text-[10.5px] text-slate-500">
                  ΔPnL {s.pnlDeltaUsd < 0 ? "−" : "+"}${Math.abs(Math.round(s.pnlDeltaUsd / 1000))}k · VaR +${Math.round(s.varImpact / 1000)}k
                </div>
              </div>
              {isActive ? (
                <span className="rounded-md bg-short/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-short ring-1 ring-short/40">
                  APPLIED
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(s.id);
                  }}
                  className="rounded-md border border-edge px-2 py-0.5 font-mono text-[10.5px] text-slate-400 transition hover:border-accent/50 hover:text-accent-2"
                >
                  APPLY
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------- heatmap ----------

export function StressHeatmap({
  scenarios,
  matrix,
  activeId,
}: {
  scenarios: Scenario[];
  matrix: { id: string; dims: number[] }[];
  activeId: string | null;
}) {
  return (
    <Panel
      title="Stress heatmap"
      icon={<>▩</>}
      right={
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <i className="h-2 w-4 rounded-sm bg-long/25" />
          <i className="h-2 w-4 rounded-sm bg-amber/30" />
          <i className="h-2 w-4 rounded-sm bg-amber/50" />
          <i className="h-2 w-4 rounded-sm bg-short/50" />
          <i className="h-2 w-4 rounded-sm bg-short/75" />
          LOW → CRITICAL
        </span>
      }
    >
      <div className="p-3">
        <div className="grid" style={{ gridTemplateColumns: "180px repeat(5, minmax(64px, 1fr))" }}>
          <div />
          {DIMENSIONS.map((d) => (
            <div key={d} className="px-2 pb-2 text-center text-[10px] uppercase tracking-[0.1em] text-slate-500">
              {d}
            </div>
          ))}
          {matrix.map((row) => {
            const s = scenarios.find((x) => x.id === row.id);
            return (
              <FragmentRow
                key={row.id}
                name={s?.name ?? row.id}
                active={row.id === activeId}
                cells={row.dims.map((b, i) => (
                  <div
                    key={i}
                    className={`flex h-10 items-center justify-center rounded-md font-mono text-[10px] font-semibold ${bandColor(b)}`}
                    title={bandLabel(b)}
                  >
                    {bandLabel(b)}
                  </div>
                ))}
              />
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function FragmentRow({ name, active, cells }: { name: string; active: boolean; cells: React.ReactNode[] }) {
  return (
    <>
      <div
        className={`flex h-10 items-center truncate border-r border-edge/60 px-2 text-[12px] ${
          active ? "font-semibold text-accent-2" : "text-slate-300"
        }`}
      >
        {name}
      </div>
      {cells}
    </>
  );
}
