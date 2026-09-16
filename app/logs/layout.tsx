import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logs — NX Trading",
  description: "Live system stream — market, signal, order, risk, agent, venue, and core events.",
};

export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
