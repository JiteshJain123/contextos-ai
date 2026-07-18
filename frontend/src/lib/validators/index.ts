/**
 * @/lib/validators — combined re-exports.
 *
 * Apps SHOULD prefer subpath imports for bundle-size and clarity:
 *
 *   import { loginSchema, type LoginInput } from "@/lib/validators/auth";
 *   import { parseInput } from "@/lib/validators/parse";
 *
 * This root entry is for tooling (typegen, OpenAPI generation) and apps
 * that genuinely need many domains at once.
 */

export * from "./primitives";
export * from "./pagination";
export * from "./parse";
export * from "./auth";
export * from "./user";
export * from "./project";
export * from "./task";
export * from "./ai";
export * from "./automation";
export * from "./health";
