import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/persona/**", "src/lib/telemetry/**"],
    },
  },
});
