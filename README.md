This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## NX Trading v2 — what's real vs mocked

Everything here is **deterministic, client-side simulation** — there is no real market data,
no broker connectivity, and nothing is an investment recommendation. To be honest about it:

**Real (real math, fixed inputs):**
- **AI Brain signals are computation, not copy.** Each model is a pure function:
  `score = clip(Σ weightᵢ · featureᵢ)`, and the attribution bars exactly decompose that score.
  Change the features (watch prices tick) and the score moves; there is no hidden generator.
- **Options math**: Black–Scholes price, greeks, IV interpolation curve, max-pain and
  gamma-weighted spots are textbook-correct from spot/strike/DTE/IV inputs.
- **Rates**: duration/DV01 from actual Macaulay math; 2s10s spread arithmetic.
- **Backtest analytics**: walk-forward (IS/OS over the *same* generated path), Monte-Carlo
  resampling with fixed seeds (reproducible), parameter-sensitivity grid.
- **Reality friction**: session clocks that actually hold quotes, FOMC event windows,
  drift that pauses models, OMS rejects (RTH-only, buying power, min-tick) that gate fills.
- **The accountability loop** is intact end-to-end: model fires → OMS gates & fills →
  P&L attributed to the model → drift detects decay → lifecycle re-gates go-live.

**Mocked (fixed seed data, no network):**
- Prices, books, funding, venue latency, broker balances, operator profile — all seeded
  constants that tick locally via `setInterval`. No REST/WS calls, no persistence;
  refresh resets state.
- "AI Agent" reasoning is a scripted trace over the same feature set — it never deviates
  from the deterministic brain output.

**How to run:** `pnpm dev` (or `pnpm build && pnpm start`). Search (`⌘K`) jumps to any
page, symbol, contract (ES, 10YU, EUR/USD…) or model (Momentum v4.2). Not investment advice.
