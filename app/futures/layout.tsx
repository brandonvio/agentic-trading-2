import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Futures — NX Trading",
  description: "Contract ladders, carry/contango shape, roll discipline, multipliers, ticks and margin.",
};

export default function FuturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
