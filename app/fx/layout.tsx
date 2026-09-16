import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FX — NX Trading",
  description: "FX majors, DXY, carry ladder, overnight swaps, safe-haven bias.",
};

export default function FxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
