"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

/**
 * Small async helpers used by every data-backed panel: they always expose
 * loading, error, a retry handle and the last good payload, so a failed fetch
 * degrades to an error state instead of an empty screen.
 *
 * Loading is *derived* from the request nonce rather than set inside an effect,
 * which keeps effects free of synchronous state updates.
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** True while a reload runs and previous data is still on screen. */
  refreshing: boolean;
}

interface AsyncResult<T> {
  nonce: number;
  data: T | null;
  error: string | null;
}

export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<AsyncResult<T>>({
    nonce: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => fetcher(controller.signal))
      .then(
        (value) => {
          if (!active) return;
          setResult(() => ({ nonce, data: value, error: null }));
        },
        (cause: unknown) => {
          if (!active || controller.signal.aborted) return;
          const message = cause instanceof Error ? cause.message : "Something went wrong.";
          setResult((previous) => ({ nonce, data: previous.data, error: message }));
        },
      );

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const loading = result.nonce !== nonce;
  return {
    data: result.data,
    loading,
    error: loading ? null : result.error,
    reload,
    refreshing: loading && result.data !== null,
  };
}

/* -------------------------------------------------------------------------- */
/* External-store subscriptions — no setState inside effects                  */
/* -------------------------------------------------------------------------- */

/** True after hydration; the server snapshot is always false. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const clockListeners = new Set<() => void>();
let clockNow: number | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockDelay = 60_000;

function subscribeClock(listener: () => void, delayMs: number): () => void {
  clockListeners.add(listener);
  if (clockTimer === null) {
    clockDelay = delayMs;
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((entry) => entry());
    }, clockDelay);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
      clockNow = null;
    }
  };
}

function readClock(): number | null {
  return clockNow;
}

function readClockServer(): number | null {
  return null;
}

/** Client-side wall clock that ticks without re-rendering the world. */
export function useClock(delayMs = 60_000): number | null {
  return useSyncExternalStore(
    (listener) => subscribeClock(listener, delayMs),
    () => {
      if (clockNow === null) clockNow = Date.now();
      return readClock();
    },
    readClockServer,
  );
}

export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Runs a timer that only ticks while `delayMs` is not null (spinners). */
export function useInterval(callback: () => void, delayMs: number | null): void {
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(callback, delayMs);
    return () => clearInterval(id);
  }, [callback, delayMs]);
}
