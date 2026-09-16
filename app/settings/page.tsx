"use client";

import { useState } from "react";
import Link from "next/link";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  deepEqual,
  DEFAULTS,
  type AppearanceSettings,
  type SettingsState,
  type WorkspaceSettings,
} from "../../lib/settings";
import {
  AppearanceSection,
  ExecutionSection,
  NotificationsSection,
  RiskSection,
  WorkspaceSection,
} from "../../components/settings";

export default function SettingsPage() {
  const mounted = useMounted();
  const [saved, setSaved] = useState<SettingsState>(() => DEFAULTS);
  const [current, setCurrent] = useState<SettingsState>(() => DEFAULTS);
  const tape = seedTickers();

  const dirty = !deepEqual(current, saved);

  const save = () => setSaved(current);
  const revert = () => setCurrent(saved);

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1280px] space-y-4 px-4 pb-24 pt-5 sm:px-6">
        {/* header */}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Settings</h1>
          <p className="text-[13px] text-slate-400">
            Desk guardrails and defaults. Demo mode — changes live in memory and reset on reload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RiskSection value={current.risk} onChange={(p) => setCurrent((s) => ({ ...s, risk: { ...s.risk, ...p } }))} />
          <ExecutionSection value={current.exec} onChange={(p) => setCurrent((s) => ({ ...s, exec: { ...s.exec, ...p } }))} />
          <NotificationsSection value={current.notify} onChange={(p) => setCurrent((s) => ({ ...s, notify: { ...s.notify, ...p } }))} />
          <AppearanceSection value={current.appearance} onChange={(p) => setCurrent((s) => ({ ...s, appearance: { ...s.appearance, ...p } as AppearanceSettings }))} />
          <WorkspaceSection value={current.workspace} onChange={(p) => setCurrent((s) => ({ ...s, workspace: { ...s.workspace, ...p } as WorkspaceSettings }))} />
          <div className="flex items-start flex-col gap-2 rounded-xl border border-edge bg-surface/50 p-4">
            <div className="text-[12px] text-slate-400">
              <span className="font-medium text-slate-300">Reset everything</span> restores the house defaults
              for every section in one move.
            </div>
            <button
              onClick={() => {
                setCurrent(DEFAULTS);
                setSaved(DEFAULTS);
              }}
              className="self-start rounded-lg border border-edge px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-amber/50 hover:text-amber"
            >
              ⟲ Restore defaults
            </button>
          </div>
        </div>

        {/* sticky action bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-edge bg-surface/95 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className={dirty ? "h-2 w-2 rounded-full bg-amber" : "h-2 w-2 rounded-full bg-long"} />
            <span className="text-[12.5px] text-slate-300">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <span className="hidden font-mono text-[10.5px] text-slate-600 sm:inline">session only · not persisted</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={revert}
              disabled={!dirty}
              className="rounded-lg border border-edge px-3.5 py-2 text-[12.5px] font-medium text-slate-300 transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revert
            </button>
            <button
              onClick={save}
              disabled={!dirty}
              className="rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>related:</span>
        <Link href="/risk-lab" className="text-accent-2 hover:underline">Risk Lab</Link>
        <span>·</span>
        <Link href="/exchanges" className="text-accent-2 hover:underline">Exchanges</Link>
        <span>·</span>
        <Link href="/profile" className="text-accent-2 hover:underline">Profile</Link>
      </div>
    </ConsoleShell>
  );
}
