import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exchanges — NX Trading",
  description: "Venue healthboard — status, latency, rate limits, balances, and the wire event log.",
};

export default function ExchangesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
