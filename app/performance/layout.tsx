import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance — NX Trading",
  description: "Account performance — 12-month return heatmap, attribution, curve vs benchmark, rolling windows.",
};

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
