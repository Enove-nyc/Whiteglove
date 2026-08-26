import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // A .cjs FILE IS COMMONJS BY DEFINITION, so require() is not a style
    // choice there — it is the only thing that works. The TypeScript preset
    // bans require() across the repo, which is right for everything Next
    // compiles and wrong for the one-shot Node scripts under scripts/.
    // Converting them to ESM to satisfy a rule aimed at application code
    // would be the tail wagging the dog.
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
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
