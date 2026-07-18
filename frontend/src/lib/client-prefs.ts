"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe client-state helpers built on useSyncExternalStore, which React
 * hydrates correctly without the "setState inside an effect" pattern.
 */

const noopSubscribe = () => () => {};

/** True after hydration on the client, false during SSR/hydration. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const prefListeners = new Set<() => void>();

function emitPrefChange() {
  for (const listener of prefListeners) listener();
}

/**
 * Boolean preference persisted in localStorage. The server snapshot is the
 * fallback, so SSR renders deterministically and the client corrects itself
 * on hydration.
 */
export function useLocalStorageFlag(key: string, fallback = false) {
  const subscribe = useCallback((onChange: () => void) => {
    prefListeners.add(onChange);
    return () => {
      prefListeners.delete(onChange);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : stored === "1";
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0");
      emitPrefChange();
    },
    [key],
  );

  return [value, setValue] as const;
}
