import { z } from "zod";

/**
 * Pagination is used by every list endpoint. Centralizing the shape here means
 * every list response from the API has the same surface — clients can build
 * a generic `usePaginated<T>()` hook against this contract.
 */

// ============== Query params (client → server) ==============
// `z.coerce.number()` because query strings arrive as strings ("?page=2").
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().min(1).max(64).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

// ============== Response wrapper (server → client) ==============
// Factory function: pass any item schema, get a paginated response schema.
// Use it like: `paginatedResponse(projectDTO)`.
export function paginatedResponse<TItem extends z.ZodType>(itemSchema: TItem) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasNext: z.boolean(),
  });
}

/**
 * Generic type for a paginated payload. Use this for typing hooks/services
 * when you don't have access to the inferred schema type.
 */
export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};
