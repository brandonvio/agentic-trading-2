import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "International — NX Trading",
  description: "ADR vs local splits, FX hedge costs, EM ETFs and USD drag.",
};

export default function IntlLayout({ children }: { children: React.ReactNode }) {
  return children;
}
