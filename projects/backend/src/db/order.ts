import type { AnyColumn, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * `ORDER BY col DESC NULLS LAST`, spelled out.
 *
 * Drizzle emits `DESC NULLS LAST` for descending *index* columns (`column.desc()`), but the plain
 * `desc(column)` order helper emits `DESC`, which Postgres treats as `DESC NULLS FIRST`. The two
 * orderings differ, so the planner refuses to use the index for the sort and falls back to scanning
 * and sorting the whole table. Use this helper wherever a query should be served by one of those
 * descending indexes.
 */
export function descNullsLast(column: AnyColumn): SQL {
  return sql`${column} DESC NULLS LAST`;
}
