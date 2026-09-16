import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rates — NX Trading",
  description: "US Treasury yield curve, duration & DV01, 2s10s spread, scenario shifts.",
};

export default function RatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
