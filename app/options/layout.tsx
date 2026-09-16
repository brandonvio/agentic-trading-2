import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Options — NX Trading",
  description: "Option chains, Black-Scholes greeks, IV skew & term structure, max pain, gamma exposure, strategy studio.",
};

export default function OptionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
