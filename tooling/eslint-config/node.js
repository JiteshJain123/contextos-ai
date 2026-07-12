import globals from "globals";

import baseConfig from "./base.js";

/**
 * Node.js preset: base + Node global types.
 * Use for Express servers, scripts, and Node-only packages (database, config).
 */
export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-process-exit": "off",
    },
  },
];
