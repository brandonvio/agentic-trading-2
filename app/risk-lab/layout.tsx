import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk Lab — NX Trading",
  description: "Scenario risk — VaR/CVaR, limit utilization gauges, and a stress heatmap across the book.",
};

export default function RiskLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
