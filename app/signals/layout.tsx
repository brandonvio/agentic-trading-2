import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signals — NX Trading",
  description:
    "Live signal desk — every order the engines want to place, with edge, confidence, and realized outcomes.",
};

export default function SignalsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
