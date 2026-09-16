import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders — NX Trading",
  description:
    "Execution desk — live order book, fills ladder, venue quality, and stop risk across the whole platform.",
};

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
