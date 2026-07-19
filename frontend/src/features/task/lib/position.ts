/**
 * Compute the fractional position for a task dropped between `before` and `after`.
 *
 * Cases:
 *   - inserting at the START of a column: before=undefined → after.position / 2
 *   - inserting at the END:               after=undefined  → before.position + 1024
 *   - inserting in the middle:            (before + after) / 2
 *   - empty column:                       0
 *
 * The "+1024" step at the end and division at the start keep gaps wide so
 * many drag operations can happen before float precision runs out.
 */
export function computeDropPosition(
  before: { position: number } | undefined,
  after: { position: number } | undefined,
): number {
  if (!before && !after) return 0;
  if (!before && after) return after.position / 2;
  if (before && !after) return before.position + 1024;
  return (before!.position + after!.position) / 2;
}
