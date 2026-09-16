// Session awareness — real market clocks (deterministic functions of Date).
// Classes: equity RTH (9:30–16:00, half-day close 12:00 on the 15th),
// futures 23h (Sun 17:00 → Fri 17:00), FX 24x5 (→ Fri 22:00), crypto 24/7.

import type { SessionClass } from "./instruments";

export type Session = "pre" | "open" | "lunch" | "closed";

export interface MarketClock {
  equity: Session;
  futuresOpen: boolean;
  fxOpen: boolean;
  cryptoOpen: boolean;
  halfDay: boolean;
  nextChangeIn: number; // ms until the next equity session boundary
  nextLabel: string;
}

const minOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const O = (h: number, m = 0) => h * 60 + m;

/** equity half-day: the 15th of the month (weekdays only) */
export const isHalfDay = (now: Date) =>
  now.getDate() === 15 && now.getDay() >= 1 && now.getDay() <= 5;

export function equitySession(now: Date): Session {
  const d = now.getDay();
  if (d === 0 || d === 6) return "closed";
  const t = minOf(now);
  const open = O(9, 30);
  const close = isHalfDay(now) ? O(12) : O(16);
  if (t < open) return "pre";
  if (t >= close) return "closed";
  return t >= O(12) ? "lunch" : "open";
}

export function futuresIsOpen(now: Date): boolean {
  const d = now.getDay();
  const t = minOf(now);
  if (d === 6) return false;
  if (d === 0) return t >= O(17);
  if (d === 5) return t < O(17);
  return true;
}

export function fxIsOpen(now: Date): boolean {
  const d = now.getDay();
  const t = minOf(now);
  if (d === 6) return false;
  if (d === 0) return t >= O(17);
  if (d === 5) return t < O(22);
  return true;
}

/** session state for a given instrument class (crypto never closes) */
export function sessionFor(cls: SessionClass, now: Date): { state: Session; label: string } {
  switch (cls) {
    case "crypto24":
      return { state: "open", label: "24/7" };
    case "equityRTH": {
      const s = equitySession(now);
      return {
        state: s,
        label:
          s === "open" ? "RTH" : s === "lunch" ? "RTH · PM" : s === "pre" ? "pre-market" : "closed",
      };
    }
    case "futures23":
      return { state: futuresIsOpen(now) ? "open" : "closed", label: "23h" };
    case "fx245":
      return { state: fxIsOpen(now) ? "open" : "closed", label: "24×5" };
  }
}

const fmt = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function marketClock(now: Date): MarketClock {
  const half = isHalfDay(now);
  const equity = equitySession(now);
  // next equity boundary: today 09:30 / close, else next weekday 09:30
  let target: Date;
  let label: string;
  if (equity === "pre") {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30);
    label = "EQ open 09:30";
  } else if (equity === "open" || equity === "lunch") {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), half ? 12 : 16, 0);
    label = `EQ close ${half ? "12:00" : "16:00"}`;
  } else {
    const next = new Date(now);
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
    target = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 9, 30);
    label = `EQ open ${fmt(target)}`;
  }
  return {
    equity,
    futuresOpen: futuresIsOpen(now),
    fxOpen: fxIsOpen(now),
    cryptoOpen: true,
    halfDay: half,
    nextChangeIn: Math.max(0, target.getTime() - now.getTime()),
    nextLabel: `${label} · ${fmt(target)}`,
  };
}
