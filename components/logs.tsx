"use client";

import { useEffect, useRef } from "react";
import type { LogLine, LogSource, LogLevel } from "../lib/logs";

const LEVEL_STYLE: Record<LogLevel, string> = {
  SYS: "bg-cyan/12 text-cyan ring-cyan/35",
  INFO: "bg-slate-500/15 text-slate-300 ring-slate-500/40",
  DEBUG: "bg-slate-600/15 text-slate-500 ring-slate-600/40",
  WARN: "bg-amber/12 text-amber ring-amber/35",
  ERROR: "bg-short/12 text-short ring-short/35",
};

export function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <span
      className={`inline-flex w-[54px] justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ring-1 ${LEVEL_STYLE[level]}`}
    >
      {level}
    </span>
  );
}

// ---------- toolbar ----------

const ALL_LEVELS: (LogLevel | "ALL")[] = ["ALL", "DEBUG", "INFO", "WARN", "ERROR", "SYS"];
const ALL_SOURCES: (LogSource | "all")[] = ["all", "market", "signal", "order", "risk", "agent", "venue", "core"];

export function ToolbarRow({
  level,
  onLevel,
  source,
  onSource,
  q,
  onQuery,
  paused,
  onTogglePause,
  onClear,
  counts,
}: {
  level: LogLevel | "ALL";
  onLevel: (l: LogLevel | "ALL") => void;
  source: LogSource | "all";
  onSource: (s: LogSource | "all") => void;
  q: string;
  onQuery: (q: string) => void;
  paused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* level chips with counts */}
      <div className="flex flex-wrap items-center gap-1">
        {ALL_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => onLevel(l)}
            className={[
              "rounded-md border px-2 py-1 font-mono text-[10.5px] tracking-wide transition-colors",
              level === l
                ? l === "ALL"
                  ? "border-accent/60 bg-accent/15 text-accent-2"
                  : `border-transparent ${LEVEL_STYLE[l as LogLevel]}`
                : "border-edge text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {l}
            <span className="ml-1 tabular-nums opacity-60">{counts[l] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mx-1 hidden h-5 w-px bg-edge sm:block" />

      {/* source select */}
      <select
        value={source}
        onChange={(e) => onSource(e.target.value as LogSource | "all")}
        className="rounded-md border border-edge bg-surface-2/70 px-2 py-1 text-[11.5px] text-slate-300 focus:border-accent/60 focus:outline-none"
      >
        {ALL_SOURCES.map((s) => (
          <option key={s} value={s} className="bg-slate-900">
            {s === "all" ? "all sources" : s}
          </option>
        ))}
      </select>

      {/* search */}
      <input
        value={q}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="filter message…"
        className="w-full min-w-[160px] rounded-md border border-edge bg-surface-2/70 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-accent/60 focus:outline-none sm:w-[220px]"
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onTogglePause}
          className="rounded-md border border-edge px-2.5 py-1.5 text-[11.5px] font-medium text-slate-300 transition hover:border-accent/50 hover:text-white"
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button
          onClick={onClear}
          className="rounded-md border border-edge px-2.5 py-1.5 text-[11.5px] font-medium text-slate-400 transition hover:border-short/50 hover:text-short"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  );
}

// ---------- table ----------

export function LogTable({ lines }: { lines: LogLine[] }) {
  const scroller = useRef<HTMLDivElement | null>(null);
  // feed is newest-first: pin to top when fresh rows arrive
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = 0;
  }, [lines.length]);
  return (
    <div className="flex max-h-[calc(100vh-330px)] min-h-[380px] flex-col overflow-hidden rounded-xl border border-edge bg-surface/50">
      <div className="flex items-center gap-3 border-b border-edge bg-surface-2/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
        <span className="w-16 shrink-0">time</span>
        <span className="w-[54px] shrink-0 text-center">level</span>
        <span className="w-[64px] shrink-0">source</span>
        <span className="flex-1">message</span>
      </div>
      <div ref={scroller} className="scroll-thin flex-1 overflow-y-auto overscroll-contain">
        <table className="w-full border-collapse font-mono text-[12px] leading-5">
          <tbody>
            {lines.map((l) => (
              <tr
                key={l.id}
                className={[
                  "border-b border-edge/40 transition-colors hover:bg-white/[0.03]",
                  l.level === "ERROR" ? "border-l-2 border-l-short/70" : "",
                ].join(" ")}
              >
                <td className="w-16 shrink-0 px-3 py-1 tabular-nums text-slate-500">{l.ts}</td>
                <td className="w-[54px] shrink-0 px-1 text-center"><LevelBadge level={l.level} /></td>
                <td className="w-[64px] shrink-0 px-1 py-1 text-slate-400">{l.source}</td>
                <td className={`px-2 py-1 ${l.level === "ERROR" ? "text-short/90" : l.level === "WARN" ? "text-amber/90" : "text-slate-300"}`}>
                  {l.msg}
                  {l.meta && <span className="ml-2 text-slate-600">{l.meta}</span>}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                  Feed cleared. Waiting for the next event…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
