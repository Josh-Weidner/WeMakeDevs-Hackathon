"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False on the server and during hydration, true afterwards. Browser-only state (like the persona) is right once true. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
