import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* Next's recommended rules plus the project's own (§12.4, §16.4): no raw HTML injection except the one JSON-LD
   component, accessible markup, and no console noise in shipped code. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-danger": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 3 }],
      "jsx-a11y/no-autofocus": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([".next/**", "node_modules/**", "extension/**", "extension-dist/**", "next-env.d.ts", "playwright-report/**", "test-results/**", ".lighthouseci/**", "tests/load/**"]),
]);
