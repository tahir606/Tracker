"use client";

import { useCallback, useSyncExternalStore } from "react";

// In-memory copy so toggles still work when localStorage is unavailable.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A boolean UI preference remembered in localStorage (e.g. a collapsed section). */
export function useStoredBoolean(
  key: string,
  fallback: boolean
): [boolean, (value: boolean) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
  const value = stored === null ? fallback : stored === "true";

  const setValue = useCallback(
    (next: boolean) => {
      memory.set(key, String(next));
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // storage unavailable — the in-memory copy still applies
      }
      listeners.forEach((l) => l());
    },
    [key]
  );

  return [value, setValue];
}
