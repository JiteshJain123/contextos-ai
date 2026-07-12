import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

import baseConfig from "./base.js";

/**
 * React preset: base + React + Hooks + a11y.
 * Use for shared component libraries (packages/ui).
 */
export default [
  ...baseConfig,
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      // Pin literally instead of "detect" — eslint-plugin-react@7.x's detect
      // path crashes on ESLint 10. Bump this when React major changes.
      react: { version: "19.0" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // React 17+ JSX transform — no need to import React in scope
      "react/react-in-jsx-scope": "off",
      // TypeScript handles prop validation
      "react/prop-types": "off",
    },
  },
];
