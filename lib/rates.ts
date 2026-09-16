// US Treasuries: yield curve, duration/DV01, 2s10s, scenario shifts.

export interface Point {
  yrs: number;
  label: string;
  yield: number; // percent
  duration: number;
}

const YIELD0: Record<string, number> = {
  "1M": 4.29,
  "3M": 4.32,
  "6M": 4.28,
  "1Y": 4.08,
  "2Y": 4.02,
  "5Y": 4.17,
  "10Y": 4.42,
  "30Y": 4.66,
};
const DUR: Record<string, number> = {
  "1M": 0.083,
  "3M": 0.246,
  "6M": 0.483,
  "1Y": 0.971,
  "2Y": 1.96,
  "5Y": 4.52,
  "10Y": 7.99,
  "30Y": 16.73,
};
const YRS: Record<string, number> = {
  "1M": 1 / 12,
  "3M": 0.25,
  "6M": 0.5,
  "1Y": 1,
  "2Y": 2,
  "5Y": 5,
  "10Y": 10,
  "30Y": 30,
};

export const LABELS = Object.keys(YIELD0);

export function yieldCurve(bp2 = 0, bp30 = 0): Point[] {
  return LABELS.map((label) => {
    // parabolic-ish shift: 2y knob pulls the front end, 30y knob the belly+long
    const t = YRS[label] / 30;
    const shift = bp2 * (1 - t) * 0.9 + bp30 * (0.25 + 0.75 * t) * 0.6;
    return { yrs: YRS[label], label, yield: Number((YIELD0[label] + shift / 100).toFixed(3)), duration: DUR[label] };
  });
}

/** DV01 = notional × modified duration × 0.01% */
export const dv01 = (notionalUsd: number, duration: number) =>
  (notionalUsd * duration) / 100;

export interface TwoTen {
  spread: number; // 10y − 2y in bp
  inverted: boolean;
  label: string;
}

export function twoTen(bp2 = 0, bp30 = 0): TwoTen {
  const c = yieldCurve(bp2, bp30);
  const s2 = c.find((p) => p.label === "2Y")!.yield;
  const s10 = c.find((p) => p.label === "10Y")!.yield;
  const spread = Math.round((s10 - s2) * 100);
  return { spread, inverted: spread < 0, label: spread >= 0 ? `+${spread}bp (normal)` : `${spread}bp (inverted)` };
}

/** notional needed so DV01 is a fixed $/bp (risk-parity sizing) */
export const notionalForDV01 = (targetDv01: number, duration: number) =>
  (targetDv01 * 100) / duration;
