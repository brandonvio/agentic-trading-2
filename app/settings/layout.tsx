import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — NX Trading",
  description:
    "Risk limits, execution defaults, notifications, appearance, and workspace preferences.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
