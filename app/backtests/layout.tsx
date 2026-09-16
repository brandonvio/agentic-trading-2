import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backtests — NX Trading",
  description: "Historical strategy evaluations — runs, equity curves, drawdowns, and parameter sweeps.",
};

export default function BacktestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
