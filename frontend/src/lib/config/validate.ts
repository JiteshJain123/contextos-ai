import type { z } from "zod";

/**
 * Validates an env object against a Zod schema.
 * On failure, throws a SINGLE error containing every issue, so operators see
 * the full picture in one boot attempt rather than fixing-and-retrying.
 *
 * Marked internal — apps should call `createServerEnv` / `createClientEnv`.
 */
export function validateEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  env: Record<string, string | undefined>,
  context: "server" | "client",
): z.output<TSchema> {
  const result = schema.safeParse(env);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(
    `[@/lib/config] Invalid ${context} environment variables:\n${issues}\n\n` +
      `Fix the above in your .env (or the corresponding deployment env) and restart.`,
  );
}
