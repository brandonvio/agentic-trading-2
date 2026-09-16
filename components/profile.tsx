import { Badge, Panel } from "./ui";
import { fmtAgo, OPERATOR, type Activity, type ActivityTone, type Apikey, type Session } from "../lib/profile";

// ---------- atoms ----------

const TONE_STYLES: Record<ActivityTone, { chip: string; label: string }> = {
  order: { chip: "bg-accent/12 text-accent-2 ring-accent/35", label: "ORDER" },
  risk: { chip: "bg-amber/12 text-amber ring-amber/35", label: "RISK" },
  auth: { chip: "bg-short/12 text-short ring-short/35", label: "AUTH" },
  signal: { chip: "bg-long/12 text-long ring-long/35", label: "SIGNAL" },
  settings: { chip: "bg-cyan/12 text-cyan ring-cyan/35", label: "CFG" },
};

function ToneChip({ tone }: { tone: ActivityTone }) {
  const s = TONE_STYLES[tone];
  return (
    <span className={`inline-flex w-[52px] justify-center rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider ring-1 ${s.chip}`}>
      {s.label}
    </span>
  );
}

// ---------- identity ----------

export function IdentityCard() {
  return (
    <Panel className="h-full">
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-accent to-cyan text-[18px] font-bold text-white shadow-lg shadow-accent/25">
            {OPERATOR.initial}
          </div>
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-long" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-tight text-slate-50">{OPERATOR.name}</h2>
            <span className="font-mono text-[11px] text-slate-500">{OPERATOR.handle}</span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-slate-400">{OPERATOR.email}</p>
          <p className="text-[11px] text-slate-500">{OPERATOR.org}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {OPERATOR.roles.map((r) => (
          <Badge key={r} tone={r === "ADMIN" ? "ai" : "ok"}>{r}</Badge>
        ))}
        <Badge tone="warn">{OPERATOR.clearance}</Badge>
      </div>

      <dl className="mt-4 space-y-2 border-t border-edge pt-3.5 text-[12px]">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Member since</dt>
          <dd className="font-mono text-slate-300">{OPERATOR.memberSince}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Active environment</dt>
          <dd className="font-mono text-long">PAPER · DEMO</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Two-factor</dt>
          <dd className="font-mono text-long">ENROLL · TOTP</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-long/25 bg-long/8 px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-long/80">This device</div>
        <div className="mt-0.5 text-[12px] text-slate-300">
          MacBook Pro · Chrome 126 <span className="text-slate-500">— you are browsing here right now.</span>
        </div>
      </div>
    </Panel>
  );
}

// ---------- API keys ----------

export function KeysTable({
  keys,
  onRotate,
  onRevoke,
}: {
  keys: Apikey[];
  onRotate?: (id: string) => void;
  onRevoke?: (id: string) => void;
}) {
  return (
    <Panel
      title="API keys"
      icon={<>⌗</>}
      right={<span className="font-mono text-[11px] text-slate-500">{keys.filter((k) => k.status === "active").length} active</span>}
      className="h-full"
    >
      <ul className="divide-y divide-edge/60">
        {keys.map((k) => {
          const dead = k.status === "revoked";
          return (
            <li key={k.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 ${dead ? "opacity-55" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-slate-200">{k.label}</span>
                  {dead ? <Badge tone="short">revoked</Badge> : <Badge tone="long">active</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-400">
                    {k.prefix}…
                  </code>
                  {k.scopes.map((s) => (
                    <span key={s} className="rounded bg-slate-800/70 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="font-mono text-[10.5px] text-slate-500">used {fmtAgo(k.lastUsedAgoSec)}</span>
                {onRotate && (
                  <button
                    onClick={() => onRotate(k.id)}
                    disabled={dead}
                    className="rounded-md border border-edge px-2 py-1 text-[11px] text-slate-300 transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ⟳ Rotate
                  </button>
                )}
                {onRevoke && (
                  <button
                    onClick={() => onRevoke(k.id)}
                    disabled={dead}
                    className="rounded-md border border-short/40 bg-short/10 px-2 py-1 text-[11px] text-short transition hover:bg-short/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✕ Revoke
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------- sessions ----------

export function SessionsList({
  sessions,
  onRevoke,
}: {
  sessions: Session[];
  onRevoke?: (id: string) => void;
}) {
  return (
    <Panel title="Active sessions" icon={<>◉</>} className="h-full">
      <ul className="divide-y divide-edge/60">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <span
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px]",
                s.current ? "bg-accent/15 text-accent-2" : "bg-slate-800/80 text-slate-400",
              ].join(" ")}
            >
              {s.current ? "🖥" : "💻"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[12.5px] font-medium text-slate-200">{s.device}</span>
                {s.current && <Badge tone="ai">this device</Badge>}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-slate-500">
                {s.ip} · {s.region} · active {fmtAgo(s.activeAgoSec)}
              </div>
            </div>
            {onRevoke && (
              <button
                onClick={() => onRevoke(s.id)}
                disabled={s.current}
                title={s.current ? "You can't revoke the current session" : "Revoke session"}
                className="rounded-md border border-edge px-2 py-1 text-[11px] text-slate-400 transition hover:border-short/50 hover:text-short disabled:cursor-not-allowed disabled:opacity-35"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="py-6 text-center text-[12px] text-slate-500">All other sessions revoked.</li>
        )}
      </ul>
    </Panel>
  );
}

// ---------- activity feed ----------

export function ActivityFeed({ activity }: { activity: Activity[] }) {
  return (
    <Panel
      title="Audit activity"
      icon={<>⌁</>}
      right={<span className="font-mono text-[11px] text-slate-500">last {Math.min(activity.length, 20)} events</span>}
      className="h-full"
    >
      <ul className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
        {activity.map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
            <ToneChip tone={a.tone} />
            <div className="min-w-0 flex-1">
              <span className="text-[12.5px] text-slate-400">{a.verb}</span>{" "}
              <span className="font-medium text-slate-200">{a.target}</span>
            </div>
            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-slate-600">
              {a.actor === "system" ? "system · " : ""}{fmtAgo(a.tsAgoSec)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
