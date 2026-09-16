import type { ReactNode } from "react";
import { Panel } from "./ui";
import {
  ACCENTS,
  DEFAULT_PAGES,
  RANGES,
  TIFS,
  VENUES,
  type SettingsState,
} from "../lib/settings";

// ---------- primitive controls ----------

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={[
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        on ? "bg-accent" : "bg-slate-700",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export function Range({
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const shown = format ? format(value) : `${value}`;
  return (
    <div className="flex w-full max-w-[220px] items-center gap-2.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-[var(--accent)]"
      />
      <span className="w-[86px] shrink-0 text-right font-mono text-[11.5px] tabular-nums text-slate-200">
        {shown} <span className="text-slate-500">{unit}</span>
      </span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-edge bg-surface-2/70 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={[
            "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            o === value ? "bg-accent/20 text-accent-2" : "text-slate-400 hover:text-slate-200",
          ].join(" ")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function SelectText({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-edge bg-surface-2/70 px-2.5 py-1.5 text-[12px] text-slate-200 focus:border-accent/60 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-slate-900">
          {o}
        </option>
      ))}
    </select>
  );
}

// ---------- section scaffolding ----------

interface Row {
  label: string;
  control: ReactNode;
  hint?: string;
}

export function SectionCard({
  title,
  description,
  icon,
  rows,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  rows: Row[];
}) {
  return (
    <Panel title={title} icon={icon} accent>
      <p className="-mt-1 mb-3 pl-5 text-[12px] text-slate-500">{description}</p>
      <ul className="divide-y divide-edge/60">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5 pl-5 pr-4">
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-slate-300">{r.label}</div>
              {r.hint && <div className="mt-0.5 text-[11px] text-slate-500">{r.hint}</div>}
            </div>
            <div className="shrink-0">{r.control}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- sections ----------

export function RiskSection({ value, onChange }: { value: SettingsState["risk"]; onChange: (p: Partial<SettingsState["risk"]>) => void }) {
  return (
    <SectionCard
      title="Risk limits"
      description="Hard guardrails enforced by the risk engine before any order leaves the desk."
      icon={<>☗</>}
      rows={[
        {
          label: "Max risk per trade",
          hint: "Equity at risk if the initial stop is hit",
          control: (
            <Range
              value={value.maxPerTradePct}
              {...RANGES.maxPerTradePct}
              format={(v) => v.toFixed(1)}
              onChange={(v) => onChange({ maxPerTradePct: v })}
            />
          ),
        },
        {
          label: "Max book exposure",
          hint: "Gross long + short notional cap",
          control: (
            <Range
              value={value.maxBookExposurePct}
              {...RANGES.maxBookExposurePct}
              format={(v) => v.toFixed(0)}
              onChange={(v) => onChange({ maxBookExposurePct: v })}
            />
          ),
        },
        {
          label: "Default stop distance",
          control: (
            <Range
              value={value.stopDistanceBps}
              {...RANGES.stopDistanceBps}
              format={(v) => v.toFixed(0)}
              onChange={(v) => onChange({ stopDistanceBps: v })}
            />
          ),
        },
        {
          label: "Kill switch on breach",
          hint: "Flatten the book immediately if limits trip",
          control: <Toggle on={value.killSwitchOn} onChange={(v) => onChange({ killSwitchOn: v })} label="Kill switch" />,
        },
      ]}
    />
  );
}

export function ExecutionSection({ value, onChange }: { value: SettingsState["exec"]; onChange: (p: Partial<SettingsState["exec"]>) => void }) {
  return (
    <SectionCard
      title="Execution"
      description="Routing defaults applied to new orders from strategies and the signal desk."
      icon={<>⇶</>}
      rows={[
        {
          label: "Default venue",
          control: (
            <SelectText
              value={value.defaultVenue}
              options={VENUES}
              onChange={(v) => onChange({ defaultVenue: v })}
            />
          ),
        },
        {
          label: "Default TIF",
          control: (
            <Segmented options={TIFS} value={value.tif} onChange={(v) => onChange({ tif: v })} />
          ),
        },
        {
          label: "Reduce-only by default",
          hint: "New orders can only shrink existing positions",
          control: <Toggle on={value.reduceOnlyDefault} onChange={(v) => onChange({ reduceOnlyDefault: v })} label="Reduce only" />,
        },
        {
          label: "Order coalescing",
          hint: "Merge same-side orders within this window",
          control: (
            <Range
              value={value.coalesceMs}
              {...RANGES.coalesceMs}
              format={(v) => v.toFixed(0)}
              onChange={(v) => onChange({ coalesceMs: v })}
            />
          ),
        },
        {
          label: "Slippage cap",
          control: (
            <Range
              value={value.slippageBpsCap}
              {...RANGES.slippageBpsCap}
              format={(v) => v.toFixed(0)}
              onChange={(v) => onChange({ slippageBpsCap: v })}
            />
          ),
        },
      ]}
    />
  );
}

export function NotificationsSection({ value, onChange }: { value: SettingsState["notify"]; onChange: (p: Partial<SettingsState["notify"]>) => void }) {
  const rows: [string, string, string][] = [
    ["orders", "Order events", "fills, cancels and rejections"],
    ["signals", "Signal alerts", "new and executed signals"],
    ["riskBreach", "Risk breaches", "limit trips and kill-switch events"],
    ["agentDecisions", "AI decisions", "when the agent overrides or intervenes"],
    ["dailyDigest", "Daily digest", "end-of-day P&L rollup"],
    ["hours", "Desk hours only", "mute everything outside 07–18 ET"],
  ];
  return (
    <SectionCard
      title="Notifications"
      description="Which events should ping the desk terminal. Demo mode: cosmetic only."
      icon={<>✉</>}
      rows={rows.map(([key, label, hint]) => ({
        label,
        hint,
        control: (
          <Toggle
            on={value[key as keyof SettingsState["notify"]]}
            onChange={(v) => onChange({ [key]: v } as Partial<SettingsState["notify"]>)}
            label={label}
          />
        ),
      }))}
    />
  );
}

export function AppearanceSection({ value, onChange }: { value: SettingsState["appearance"]; onChange: (p: Partial<SettingsState["appearance"]>) => void }) {
  return (
    <SectionCard
      title="Appearance"
      description="Look and feel of the console. Dark is the only truth."
      icon={<>◑</>}
      rows={[
        {
          label: "Accent",
          control: (
            <div className="flex items-center gap-1.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  title={a.key}
                  onClick={() => onChange({ accent: a.key })}
                  className={[
                    "h-5 w-5 rounded-full border-2 transition-transform",
                    value.accent === a.key
                      ? "scale-110 border-white/80"
                      : "border-transparent opacity-70 hover:opacity-100",
                  ].join(" ")}
                  style={{ background: a.swatch }}
                />
              ))}
            </div>
          ),
        },
        {
          label: "Density",
          control: (
            <Segmented
              options={["comfortable", "compact"] as const}
              value={value.density}
              onChange={(v) => onChange({ density: v })}
            />
          ),
        },
        {
          label: "Compact tables",
          hint: "Tighter rows on dense books",
          control: (
            <Toggle on={value.compactTables} onChange={(v) => onChange({ compactTables: v })} label="Compact tables" />
          ),
        },
      ]}
    />
  );
}

export function WorkspaceSection({ value, onChange }: { value: SettingsState["workspace"]; onChange: (p: Partial<SettingsState["workspace"]>) => void }) {
  return (
    <SectionCard
      title="Workspace"
      description="Session defaults for a new desk tab."
      icon={<>⌂</>}
      rows={[
        {
          label: "Landing page",
          control: (
            <SelectText
              value={value.defaultPage}
              options={DEFAULT_PAGES}
              onChange={(v) => onChange({ defaultPage: v })}
            />
          ),
        },
        {
          label: "Locale",
          control: (
            <SelectText
              value={value.locale}
              options={["en-US", "en-GB", "de-DE", "ja-JP"]}
              onChange={(v) => onChange({ locale: v })}
            />
          ),
        },
        {
          label: "Timezone offset",
          control: (
            <SelectText
              value={value.utcOffset}
              options={["UTC−8 (PT)", "UTC−5 (ET)", "UTC (zero)", "UTC+1 (CET)"]}
              onChange={(v) => onChange({ utcOffset: v })}
            />
          ),
        },
      ]}
    />
  );
}
