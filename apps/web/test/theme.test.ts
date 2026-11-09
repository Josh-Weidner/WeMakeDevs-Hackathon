import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, parsePreference, resolveDark } from "../src/lib/theme/theme";

describe("theme", () => {
  it("accepts only known preferences and otherwise follows the system", () => {
    for (const ok of ["system", "light", "dark"] as const) expect(parsePreference(ok)).toBe(ok);
    for (const bad of [null, undefined, "", "DARK", "blue", "{}"]) expect(parsePreference(bad)).toBe("system");
  });

  it("resolves whether the dark palette applies", () => {
    expect(resolveDark("dark", false)).toBe(true);
    expect(resolveDark("light", true)).toBe(false);
    expect(resolveDark("system", true)).toBe(true);
    expect(resolveDark("system", false)).toBe(false);
  });

  it("ships a self-contained init script keyed on the same storage key, that cannot throw", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_INIT_SCRIPT.startsWith("(function(){try{")).toBe(true);
    expect(THEME_INIT_SCRIPT).toContain("catch(e){}");
    // Evaluate it against a fake DOM to prove it applies the class and tolerates blocked storage.
    const classes = new Set<string>();
    const document = { documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } } };
    const run = (storage: unknown, dark: boolean) =>
      new Function("localStorage", "window", "document", THEME_INIT_SCRIPT)(storage, { matchMedia: () => ({ matches: dark }) }, document);

    run({ getItem: () => "dark" }, false);
    expect(classes.has("dark")).toBe(true);
    run({ getItem: () => "light" }, true);
    expect(classes.has("dark")).toBe(false);
    run({ getItem: () => null }, true);
    expect(classes.has("dark")).toBe(true);
    expect(() => run({ getItem: () => { throw new Error("blocked"); } }, true)).not.toThrow();
  });
});
