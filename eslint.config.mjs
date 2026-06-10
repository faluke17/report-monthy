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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev/utility scripts — not production code
    "scripts/**",
  ]),
  {
    rules: {
      // Supabase types are incomplete (nrw_branch_monthly, mnf_ema_daily not yet generated).
      // Downgrade to warn until types are regenerated via: npx supabase gen types typescript --linked
      "@typescript-eslint/no-explicit-any": "warn",
      // Async fetch inside useEffect (fetch() / triggerSync()) is standard pattern in React 18.
      // The rule flags it as "synchronous setState" which is inaccurate for async callbacks.
      "react-hooks/set-state-in-effect": "warn",
      // React Compiler purity rules flag valid patterns that work correctly in current React 18.
      // React Compiler is NOT enabled (next.config.ts). Downgrade until it is turned on.
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
