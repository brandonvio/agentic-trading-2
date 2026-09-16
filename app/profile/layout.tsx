import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — NX Trading",
  description: "Operator identity, API keys, active sessions, and audit activity.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
