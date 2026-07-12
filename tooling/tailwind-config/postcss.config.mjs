/**
 * Shared PostCSS configuration for Tailwind v4.
 *
 * Apps consume by re-exporting in their own postcss.config.mjs:
 *   export { default } from "@contextos-ai/tailwind-config/postcss";
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
