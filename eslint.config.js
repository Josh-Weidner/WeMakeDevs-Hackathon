import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/next-env.d.ts", ".claude/**", "seed/out/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // Layering guard (CLAUDE.md §2): web must never import server-only shared modules.
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@confy/shared", message: "web may only import @confy/shared/contracts." },
            { name: "@elastic/elasticsearch", message: "web never talks to Elasticsearch; go through the api." },
            { name: "openai", message: "web never calls OpenAI; go through the api." },
          ],
        },
      ],
    },
  },
  // Accessibility (Merge Forward): strict jsx-a11y on all UI code.
  {
    files: ["apps/web/**/*.tsx"],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    files: ["apps/web/**/*.tsx"],
    rules: {
      // "Every button needs a label": off in the strict preset, so enable explicitly.
      "jsx-a11y/control-has-associated-label": [
        "error",
        { labelAttributes: ["aria-label", "aria-labelledby", "title"], ignoreElements: ["input", "textarea", "select", "td", "th", "tr"] },
      ],
    },
  },
  {
    files: ["apps/web/**/*.tsx"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
);
