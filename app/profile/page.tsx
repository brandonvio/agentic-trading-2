"use client";

import { useState } from "react";
import { ConsoleShell, Splash, useMounted } from "../../components/framework";
import { seedTickers } from "../../lib/market";
import {
  OPERATOR,
  revokeKey,
  revokeSession,
  rotateKey,
  seedProfile,
  type ProfileState,
} from "../../lib/profile";
import { ActivityFeed, IdentityCard, KeysTable, SessionsList } from "../../components/profile";

export default function ProfilePage() {
  const mounted = useMounted();
  const [state, setState] = useState<ProfileState>(() => seedProfile());
  const tape = seedTickers();

  if (!mounted) return <Splash />;

  return (
    <ConsoleShell tickers={tape}>
      <div className="mx-auto max-w-[1560px] space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-50">Operator profile</h1>
            <p className="text-[13px] text-slate-400">
              Who is at the desk, which keys and sessions have a seat — and the audit trail behind it.
            </p>
          </div>
          <div className="rounded-lg border border-edge bg-surface/80 px-3 py-2 font-mono text-[11.5px] text-slate-400">
            {OPERATOR.handle} · env <span className="text-long">paper</span> · clearance{" "}
            <span className="text-amber">{OPERATOR.clearance}</span>
          </div>
        </div>

        {/* identity + activity */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <IdentityCard />
          </div>
          <div className="xl:col-span-8">
            <ActivityFeed activity={state.activity} />
          </div>
        </div>

        {/* keys + sessions */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <KeysTable
              keys={state.keys}
              onRotate={(id) => setState((s) => rotateKey(s, id))}
              onRevoke={(id) => setState((s) => revokeKey(s, id))}
            />
          </div>
          <div className="xl:col-span-5">
            <SessionsList
              sessions={state.sessions}
              onRevoke={(id) => setState((s) => revokeSession(s, id))}
            />
          </div>
        </div>

        <footer className="pt-2 text-center text-[11px] text-slate-600">
          Identity and audit rows are simulated locally — nothing leaves this browser. NX Trading · demo environment
        </footer>
      </div>
    </ConsoleShell>
  );
}
