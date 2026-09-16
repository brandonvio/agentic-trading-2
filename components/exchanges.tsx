import { LiveDot, Panel, Ring } from "./ui";
import { fmtAge, type Venue, type VenueEvent, type VenueStatus } from "../lib/exchanges";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const STATUS_META: Record<VenueStatus, { label: string; chip: string; dot: string }> = {
  online: {
    label: "ONLINE",
    chip: "bg-long/12 text-long ring-long/35",
    dot: "bg-long shadow-[0_0_6px_rgba(16,185,129,0.9)]",
  },
  degraded: {
    label: "DEGRADED",
    chip: "bg-amber/12 text-amber ring-amber/35",
    dot: "bg-amber shadow-[0_0_6px_rgba(245,158,11,0.9)]",
  },
  maintenance: {
    label: "MAINT",
    chip: "bg-short/12 text-short ring-short/35",
    dot: "bg-short shadow-[0_0_6px_rgba(244,63,94,0.9)]",
  },
};

export function StatusChip({ status }: { status: VenueStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9.5px] font-semibold tracking-wider ring-1 ${m.chip}`}>
      <LiveDot color={`var(--color-${status === "online" ? "long" : status === "degraded" ? "amber" : "short"})`} />
      {m.label}
    </span>
  );
}

// ---------- venue card ----------

export function VenueCard({ venue, onSuspend }: { venue: Venue; onSuspend?: (name: string) => void }) {
  const rl = venue.rlimitUsed / Math.max(1, venue.rlimitMax);
  const rlTone = rl > 0.85 ? "var(--short)" : rl > 0.6 ? "var(--amber)" : "var(--long)";
  const dead = venue.status === "maintenance";

  return (
    <div
      className={[
        "relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-surface/70 p-3.5 transition-colors",
        dead ? "border-short/40" : venue.status === "degraded" ? "border-amber/40" : "border-edge hover:border-edge-2",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-slate-50">{venue.name}</div>
          <div className="mt-0.5 font-mono text-[10.5px] text-slate-500">
            {venue.tag} · {venue.region}
          </div>
        </div>
        <StatusChip status={venue.status} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="p50" value={`${venue.p50ms}ms`} warn={venue.status !== "online"} />
        <Stat label="p99" value={`${venue.p99ms}ms`} warn={venue.status !== "online"} />
        <Stat label="Balances" value={venue.balUsd > 0 ? usd(venue.balUsd) : "—"} />
        <Stat label="Taker fee" value={venue.feeBps > 0 ? `${venue.feeBps.toFixed(1)} bps` : "zero"} />
      </div>

      <div className="flex items-center gap-3">
        <Ring value={rl * 100} tone={rlTone} size={44} stroke={5}>
          <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-300">
            {Math.round(rl * 100)}%
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Rate limit</div>
          <div className="font-mono text-[12px] tabular-nums text-slate-300">
            {venue.rlimitUsed.toLocaleString()} / {venue.rlimitMax.toLocaleString()} req
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Sync</div>
          <div className="font-mono text-[12px] text-slate-300">{fmtAge(venue.lastSyncAgoSec)}</div>
        </div>
      </div>

      {onSuspend && (
        <button
          onClick={() => onSuspend(venue.name)}
          disabled={dead}
          className="self-start rounded-md border border-edge px-2 py-1 text-[10.5px] text-slate-500 transition hover:border-short/50 hover:text-short disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⏸ Suspend venue
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-900/50 px-2 py-1.5">
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div className={`font-mono text-[12.5px] tabular-nums ${warn ? "text-amber" : "text-slate-200"}`}>{value}</div>
    </div>
  );
}

// ---------- kpis ----------

export function Kpis({ venues }: { venues: Venue[] }) {
  const online = venues.filter((v) => v.status === "online").length;
  const avgP50 = Math.round(venues.reduce((a, v) => a + v.p50ms, 0) / Math.max(1, venues.length));
  const bal = venues.reduce((a, v) => a + v.balUsd, 0);
  const alerts = venues.filter((v) => v.status !== "online").length;
  const tiles: [string, string, string][] = [
    ["VENUES", String(venues.length), "text-slate-300"],
    ["ONLINE", `${online}/${venues.length}`, online === venues.length ? "text-long" : "text-amber"],
    ["AVG P50", `${avgP50}ms`, "text-slate-300"],
    ["AGG BALANCE", usd(bal), "text-slate-300"],
    ["ACTIVE ALERTS", String(alerts), alerts > 0 ? "text-short" : "text-long"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(([l, v, c]) => (
        <div key={l} className="rounded-xl border border-edge bg-surface/70 px-3 py-2.5">
          <div className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500">{l}</div>
          <div className={`mt-0.5 truncate font-mono text-[15.5px] font-semibold tabular-nums ${c}`}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- event log ----------

const LEVEL: Record<VenueEvent["level"], string> = {
  ok: "text-long",
  warn: "text-amber",
  err: "text-short",
};

export function VenueEventLog({ events }: { events: VenueEvent[] }) {
  return (
    <Panel
      title="Venue events"
      icon={<>≋</>}
      right={<span className="font-mono text-[11px] text-slate-500">{events.length} in window · 20min</span>}
    >
      <ul className="max-h-[360px] divide-y divide-edge/50 overflow-y-auto pr-1 font-mono text-[12px]">
        {events.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2.5 py-1.5">
            <span className="w-14 shrink-0 text-right text-[10.5px] tabular-nums text-slate-600">{fmtAge(e.tsAgoSec)}</span>
            <span className={`shrink-0 ${LEVEL[e.level]} w-[52px]`}>{e.level.toUpperCase()}</span>
            <span className="w-[86px] shrink-0 truncate text-slate-400">{e.venue}</span>
            <span className="min-w-0 flex-1 truncate text-slate-300">{e.msg}</span>
          </li>
        ))}
        {events.length === 0 && (
          <li className="py-6 text-center text-slate-500">Quiet on the wire.</li>
        )}
      </ul>
    </Panel>
  );
}
