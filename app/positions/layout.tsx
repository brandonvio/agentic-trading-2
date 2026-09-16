import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Positions — NX Trading",
  description:
    "Open positions with marks, MFE/MAE, realized trade log, and per-symbol P&L attribution.",
};

export default function PositionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
