"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { kindIcon } from "./search-meta";
import { INDEX, queryHits, type SearchHit } from "../lib/search";

// ---------- store (SSR-safe) ----------

type Listener = () => void;

const listeners = new Set<Listener>();
let open = false;

function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const getSnapshot = () => open;

function setOpen(v: boolean) {
  if (open === v) return;
  open = v;
  listeners.forEach((l) => l());
}

// ---------- context ----------

interface SearchApi {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

const SearchCtx = createContext<SearchApi | null>(null);

export function useSearch(): SearchApi {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider>");
  return ctx;
}

// ---------- palette ----------

const KIND_TONE: Record<SearchHit["kind"], string> = {
  Page: "text-accent-2",
  Symbol: "text-cyan",
  Instrument: "text-cyan",
  Strategy: "text-long",
  Engine: "text-amber",
  Venue: "text-short",
  Model: "text-accent-2",
  Broker: "text-long",
};

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => queryHits(q), [q]);
  const idx = hits.length ? Math.min(active, hits.length - 1) : 0;

  const go = (h: SearchHit) => {
    onClose();
    if (h.href && h.href !== window.location.pathname) router.push(h.href);
  };

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(hits.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + Math.max(hits.length, 1)) % Math.max(hits.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = hits[idx];
      if (h) go(h);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-edge-2 bg-surface shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.04]">
        {/* input */}
        <div className="flex items-center gap-2.5 border-b border-edge px-4">
          <span className="text-[15px] text-slate-500">∿</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to page, symbol, strategy, engine, venue…"
            className="h-12 flex-1 bg-transparent text-[14px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
            aria-label="Search"
          />
          <kbd className="rounded border border-edge bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500">esc</kbd>
        </div>

        {/* results */}
        <ul className="max-h-[380px] overflow-y-auto py-1.5" role="listbox">
          {hits.length === 0 && (
            <li className="px-4 py-6 text-center text-[12.5px] text-slate-500">no matches for “{q}” — try a symbol, page, or engine</li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.id}
              role="option"
              aria-selected={i === idx}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${
                i === idx ? "bg-accent/12 ring-1 ring-inset ring-accent/30" : ""
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-edge bg-surface-2 text-[12px] ${KIND_TONE[h.kind]}`}>
                {kindIcon(h.kind)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-100">{h.title}</span>
                <span className="block truncate text-[11px] text-slate-500">{h.subtitle}</span>
              </span>
              <span className="rounded border border-edge px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">{h.kind}</span>
            </li>
          ))}
        </ul>

        {/* hints */}
        <div className="flex items-center gap-4 border-t border-edge px-4 py-2 font-mono text-[10px] text-slate-600">
          <span>▲▼ move</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto">{hits.length}/{INDEX.length} hits</span>
        </div>
      </div>
    </div>
  );
}

// ---------- provider ----------

export function SearchProvider({ children }: { children: ReactNode }) {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!getSnapshot());
        return;
      }
      if (e.key === "/" && !typing && !getSnapshot()) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const api = useMemo<SearchApi>(
    () => ({
      isOpen,
      openPalette: () => setOpen(true),
      closePalette: () => setOpen(false),
    }),
    [isOpen],
  );

  return (
    <SearchCtx.Provider value={api}>
      {children}
      {isOpen && <Palette onClose={() => setOpen(false)} />}
    </SearchCtx.Provider>
  );
}

/** TopBar trigger styled like the old search box. */
export function SearchTrigger() {
  const { openPalette } = useSearch();
  return (
    <button
      type="button"
      onClick={openPalette}
      className="hidden sm:flex items-center gap-2 rounded-lg border border-edge bg-surface-2/60 px-3 py-1.5 w-64 text-left transition hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      aria-label="Open search (⌘K)"
    >
      <span className="text-slate-500">⌕</span>
      <span className="flex-1 truncate text-[12.5px] text-slate-500">Jump to…</span>
      <kbd className="rounded border border-edge px-1 text-[10px] text-slate-500">⌘K</kbd>
    </button>
  );
}

/** Compact mobile search button. */
export function SearchTriggerMobile() {
  const { openPalette } = useSearch();
  return (
    <button
      type="button"
      onClick={openPalette}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-surface-2/60 text-[13px] text-slate-400 transition hover:border-accent/50 sm:hidden"
      aria-label="Open search"
    >
      ⌕
    </button>
  );
}
