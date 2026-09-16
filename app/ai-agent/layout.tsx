import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent — NX Trading",
  description: "Autopilot observer — live reasoning stream, confidence, guardrails, and model telemetry.",
};

export default function AiAgentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
