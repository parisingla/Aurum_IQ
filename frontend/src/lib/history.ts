"use client";

/**
 * Session-scoped research history, kept in localStorage.
 * Entries are only written after a calculation actually succeeds, so the
 * Recent Research list never shows fabricated completions.
 */

export type ResearchKind = "relative-value" | "backtest";

export interface ResearchRun {
  id: string;
  kind: ResearchKind;
  /** Human label, e.g. "GOLDM vs GOLDPETAL" */
  label: string;
  instruments: string;
  createdAt: string;
  status: "complete";
  href: string;
}

const KEY = "aurum-iq.research-runs";
const EVENT = "aurum:research-runs";
const MAX_RUNS = 12;

/** Stable empty array — getServerSnapshot must return a cached value. */
const EMPTY_RUNS: ResearchRun[] = [];

let cache: ResearchRun[] | null = null;

function read(): ResearchRun[] {
  if (cache !== null) return cache;
  if (typeof window === "undefined") return EMPTY_RUNS;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as ResearchRun[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(runs: ResearchRun[]): void {
  cache = runs.slice(0, MAX_RUNS);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable (private mode) — history is best-effort */
  }
}

export function recordRun(run: Omit<ResearchRun, "createdAt"> & { createdAt?: string }): void {
  const entry: ResearchRun = { ...run, createdAt: run.createdAt ?? new Date().toISOString() };
  const runs = read().filter((r) => r.id !== entry.id);
  write([entry, ...runs]);
}

export function listRuns(): ResearchRun[] {
  return read();
}

/** Cached server snapshot for useSyncExternalStore. */
export function emptyRuns(): ResearchRun[] {
  return EMPTY_RUNS;
}

export function clearRuns(): void {
  write([]);
}

export function subscribeRuns(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export const KIND_LABEL: Record<ResearchKind, string> = {
  "relative-value": "Relative-value analysis",
  backtest: "Historical strategy evaluation",
};
