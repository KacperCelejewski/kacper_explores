import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // React Compiler rules introduced with eslint-plugin-react-hooks v6.
    // Existing hits are mount-time reads of localStorage / URL params that must
    // run after hydration. Kept visible as warnings until those components move
    // to useSyncExternalStore; new code should not add more.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
