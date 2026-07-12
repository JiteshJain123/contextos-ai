import { defineConfig } from "tsup";

/**
 * Production build configuration.
 *
 * Why tsup (over plain tsc):
 *   - Bundles workspace deps (@contextos-ai/config, /database, /validators)
 *     into a single artifact — production doesn't need `node_modules` of
 *     internal packages, only their compiled JS.
 *   - esbuild-fast: full rebuild in ~100ms.
 *   - Handles .js extensions in TS source correctly across NodeNext + bundler resolution.
 *
 * Output: dist/index.js (plus sourcemaps).
 */
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  // Preserve class names so `instanceof AppError` and error subclass names
  // stay correct in the bundled output (esbuild mangles them otherwise).
  keepNames: true,
  // pino transports (pino-pretty, pino-http) use dynamic require() internally
  // and must remain as runtime dependencies — bundling them breaks the transport.
  // @node-rs/argon2 is a native addon (.node binary) that cannot be bundled.
  external: ["pino", "pino-pretty", "pino-http", "@node-rs/argon2"],
  // Workspace packages bundle in — they live in node_modules via symlinks
  // and resolving them at runtime would break the deploy artifact.
  noExternal: [/^@contextos-ai\//],
});
