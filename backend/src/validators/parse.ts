import type { z } from "zod";

/**
 * One error class used by both API routes and form handlers.
 *
 * Why a dedicated class:
 *   Apps need to distinguish "user input was bad" from "infra failed". A
 *   typed exception is the cleanest discriminator — backend converts to
 *   HTTP 400, frontend maps to form-field errors.
 */
export class ValidationError extends Error {
  public readonly issues: ReadonlyArray<z.ZodIssue>;

  constructor(issues: z.ZodIssue[]) {
    super(`Validation failed: ${issues.length} issue(s)`);
    this.name = "ValidationError";
    this.issues = issues;
  }

  /**
   * Flatten issues into `{ "field.path": ["message1", "message2"] }`.
   *
   * Useful in form handlers — pass directly to react-hook-form's `setError`
   * helpers or render under each input.
   */
  toFlatErrors(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
      (out[key] ??= []).push(issue.message);
    }
    return out;
  }

  /** Serializable JSON shape — safe to return from API handlers. */
  toJSON(): { name: string; message: string; errors: Record<string, string[]> } {
    return {
      name: this.name,
      message: this.message,
      errors: this.toFlatErrors(),
    };
  }
}

/**
 * Validate `data` against `schema`. On failure, throws `ValidationError`.
 * On success, returns the parsed (and coerced/transformed) data with the
 * inferred type.
 *
 * Use this everywhere you need to validate input — single, consistent error
 * path across the whole monorepo.
 *
 * @example
 * // In an API route handler:
 * try {
 *   const input = parseInput(loginSchema, req.body);
 *   // input is fully typed as LoginInput
 * } catch (err) {
 *   if (err instanceof ValidationError) return res.status(400).json(err);
 *   throw err;
 * }
 */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error.issues);
  return result.data;
}
