import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // We hydrate client-only state (settings, favorites, the cached schedule
      // and the dismissed install/disclaimer flags) inside an effect on mount —
      // this is the SSR-safe
      // pattern (localStorage is undefined on the server, so a lazy initializer
      // would crash). The synchronous setState there is intentional, so this
      // rule is a warning rather than a build-breaking error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
