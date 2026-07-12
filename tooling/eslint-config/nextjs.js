import nextPlugin from "@next/eslint-plugin-next";

import reactConfig from "./react.js";

/**
 * Next.js preset: react + Next plugin (recommended + core-web-vitals).
 * Use for the Next.js frontend app (apps/web).
 */
export default [
  ...reactConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // App Router only — disable the pages-directory check
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
