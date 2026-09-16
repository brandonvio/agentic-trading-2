import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Core — NX Trading",
  description: "Cross-asset market engine — shared regime and shocks, session clocks, macro calendar, all instruments.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
