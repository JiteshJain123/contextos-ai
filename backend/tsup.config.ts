import { defineConfig } from "tsup";

/**
 * Production build configuration.
 *
 * Why tsup (over plain tsc):
 *   - Bundles all src (including "@/..." path-alias imports) into a single artifact.
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
});
