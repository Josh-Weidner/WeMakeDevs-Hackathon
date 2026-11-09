/** Pure theme logic (unit-tested). The provider and the no-flash script both build on these. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "confy:theme";
export const THEME_CHANGE_EVENT = "confy:theme-change";
export const THEME_OPTIONS: readonly ThemePreference[] = ["system", "light", "dark"];

/** Anything that isn't a known preference (missing, corrupted, old) falls back to following the system. */
export function parsePreference(raw: string | null | undefined): ThemePreference {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

/** Whether the dark palette applies for this preference, given the operating system's current setting. */
export function resolveDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  return preference === "dark" || (preference === "system" && systemPrefersDark);
}

/**
 * Runs in <head> before first paint so there's no flash of the wrong theme. It must stay self-contained
 * (it's inlined as a string) and must never throw: storage can be blocked.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||((p===null||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
