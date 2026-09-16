// Macro event calendar — deterministic monthly schedule + pre/post shock windows.
// Event phases: pre (≤90m out) → live (±5m around the print) → post (≤60m after).

export type EventKind = "FOMC" | "CPI" | "NFP" | "PCE" | "ECB";

export interface MacroEvent {
  id: string;
  kind: EventKind;
  label: string;
  ts: number;
  volMult: number;
  /** expected complex sign at the print (−1 risk-off print) */
  bias: -1 | 0 | 1;
}

export type EventPhase = "none" | "pre" | "live" | "post";

export interface EventState {
  phase: EventPhase;
  event: MacroEvent | null; // the event driving the phase (post/live) or the upcoming one (pre)
  nextEvent: MacroEvent | null;
  countdown: string; // to nextEvent
}

const PROFILE: Record<EventKind, { vol: number; bias: -1 | 0 | 1; h: number; m: number }> = {
  FOMC: { vol: 3.2, bias: -1, h: 14, m: 0 },
  CPI: { vol: 2.8, bias: -1, h: 8, m: 30 },
  NFP: { vol: 2.6, bias: 1, h: 8, m: 30 },
  PCE: { vol: 2.2, bias: -1, h: 14, m: 30 },
  ECB: { vol: 1.9, bias: 0, h: 12, m: 0 },
};

export const PRE_MS = 90 * 60e3;
export const LIVE_MS = 5 * 60e3;
export const POST_MS = 60 * 60e3;

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function at(y: number, m: number, day: number, kind: EventKind): Date {
  const d = Math.min(day, daysIn(y, m));
  const p = PROFILE[kind];
  return new Date(y, m, d, p.h, p.m);
}

/** deterministic monthly calendar for the next ~45 days */
export function seedEvents(now: number): MacroEvent[] {
  const b = new Date(now);
  const out: MacroEvent[] = [];
  for (const mo of [b.getMonth(), b.getMonth() + 1]) {
    const y = b.getFullYear() + Math.floor(mo / 12);
    const mm = mo % 12;
    const push = (kind: EventKind, day: number) => {
      const ts = at(y, mm, day, kind).getTime();
      if (ts > now && ts < now + 45 * 864e5) {
        const d = new Date(ts);
        out.push({
          id: `${kind}-${y}-${mm}`,
          kind,
          label: `${kind} · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          ts,
          volMult: PROFILE[kind].vol,
          bias: PROFILE[kind].bias,
        });
      }
    };
    push("NFP", 1);
    push("ECB", 6);
    push("CPI", 10);
    push("PCE", 13);
    push("FOMC", 30);
  }
  return out.sort((a, b2) => a.ts - b2.ts);
}

export function countdown(ts: number, now: number): string {
  let s = Math.max(0, Math.round((ts - now) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function eventState(now: number, events: MacroEvent[]): EventState {
  const live = events.find((e) => Math.abs(e.ts - now) <= LIVE_MS);
  if (live)
    return {
      phase: "live",
      event: live,
      nextEvent: live,
      countdown: countdown(live.ts, now),
    };
  const past = [...events].reverse().find((e) => e.ts <= now);
  if (past && now - past.ts <= POST_MS) {
    const next = events.find((e) => e.ts > now);
    return {
      phase: "post",
      event: past,
      nextEvent: next ?? null,
      countdown: next ? countdown(next.ts, now) : "—",
    };
  }
  const next = events.find((e) => e.ts > now);
  if (next && next.ts - now <= PRE_MS)
    return { phase: "pre", event: next, nextEvent: next, countdown: countdown(next.ts, now) };
  return {
    phase: "none",
    event: null,
    nextEvent: next ?? null,
    countdown: next ? countdown(next.ts, now) : "—",
  };
}

export const volMultFor = (phase: EventPhase): number =>
  phase === "live" ? 3 : phase === "pre" ? 2.2 : phase === "post" ? 1.6 : 1;

/** one-shot complex gap % applied at the print (signed: − = risk-off equity gap) */
export const printGap = (ev: MacroEvent): number => ev.bias * ev.volMult * 0.0045;
