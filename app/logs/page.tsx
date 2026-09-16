"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  clearLines,
  seedLines,
  tickLines,
  type LogLine,
  type LogSource,
  type LogLevel,
} from "../../lib/logs";
import { LogTable, ToolbarRow } from "../../components/logs";

export default function LogsPage() {
  const mounted = useMounted();
  const [lines, setLines] = useState<LogLine[]>(() => seedLines());
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [source, setSource] = useState<LogSource | "all">("all");
  const [q, setQ] = useState("");
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(0);

  const activeRef = useRef(true);
  const lenRef = useRef(30);
  const lastLenRef = useRef(30);

  useEffect(() => {
    activeRef.current = !paused;
  }, [paused]);

  useEffect(() => {
    lenRef.current = lines.length;
  }, [lines.length]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (activeRef.current) setLines((ls) => tickLines(ls));
    }, 1600);
    let last = Date.now();
    const sampler = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0.5, (now - last) / 1000);
      last = now;
      const delta = Math.max(0, lenRef.current - lastLenRef.current);
      lastLenRef.current = lenRef.current;
      setRate(delta / dt);
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(sampler);
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: lines.length };
    for (const l of lines) c[l.level] = (c[l.level] ?? 0) + 1;
    return c;
  }, [lines]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lines.filter((l) => {
      if (level !== "ALL" && l.level !== level) return false;
      if (source !== "all" && l.source !== source) return false;
      if (needle && !(l.msg + " " + l.source).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [lines, level, source, q]);

  const tape = seedTickers();
  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Logs</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] tracking-wider ring-1 ${
                  paused ? "bg-amber/12 text-amber ring-amber/35" : "bg-long/12 text-long ring-long/35"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-amber" : "pulse-dot bg-long shadow-[0_0_6px_rgba(16,185,129,0.9)]"}`} />
                {paused ? "PAUSED" : "STREAMING"}
              </span>
            </div>
            <p className="font-mono text-[12px] text-slate-500">
              {rate.toFixed(1)} lines/s · {lines.length} buffered (cap 200)
            </p>
          </div>
        </div>

        <ToolbarRow
          level={level}
          onLevel={setLevel}
          source={source}
          onSource={setSource}
          q={q}
          onQuery={setQ}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onClear={() => setLines(clearLines())}
          counts={counts}
        />

        <LogTable lines={filtered} />

        <p className="text-center text-[11px] text-slate-600">
          {filtered.length} / {lines.length} lines shown · log stream is simulated, wall-clock timestamps
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>related:</span>
          <Link href="/orders" className="text-accent-2 hover:underline">Orders</Link>
          <span>·</span>
          <Link href="/ai-agent" className="text-accent-2 hover:underline">AI Agent</Link>
          <span>·</span>
          <Link href="/exchanges" className="text-accent-2 hover:underline">Exchanges</Link>
        </div>
      </div>
    </ConsoleShell>
  );
}
