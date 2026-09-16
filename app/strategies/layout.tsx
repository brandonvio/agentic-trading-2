import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategies — NX Trading",
  description: "Register, inspect and risk-manage every live trading strategy.",
};

export default function StrategiesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
