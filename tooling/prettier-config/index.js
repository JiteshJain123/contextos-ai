import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Shared Prettier configuration for the contextos-ai monorepo.
 * Consumed by root .prettierrc.mjs which re-exports it.
 *
 * Plugins are resolved via require.resolve so they load from THIS package's
 * node_modules — meaning consumers don't need to install the plugins themselves.
 *
 * @type {import("prettier").Config}
 */
const config = {
  // Layout
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",

  // Punctuation
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",

  // Plugins (absolute path so it resolves from THIS package's node_modules)
  plugins: [require.resolve("prettier-plugin-tailwindcss")],

  // Plugin: Tailwind — keep in sync with apps that have a tailwind config.
  // Each app may override by adding tailwindConfig in its own .prettierrc.
  tailwindFunctions: ["clsx", "cn", "cva", "tw"],
};

export default config;
