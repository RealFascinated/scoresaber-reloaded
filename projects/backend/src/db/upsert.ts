import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * The `setWhere` of an `ON CONFLICT DO UPDATE` that only fires when one of `columns` would actually
 * change. Without it, re-upserting unchanged data still writes a new row version (WAL, dead tuples
 * and index churn) for every row.
 *
 * @param columns the columns the conflict update sets, taken from the table being upserted into
 * @returns a condition comparing the existing row against `excluded`
 */
export function differsFromExcluded(columns: AnyPgColumn[]): SQL {
  const current = sql.join(
    columns.map(column => sql`${column}`),
    sql`, `
  );
  const incoming = sql.join(
    columns.map(column => sql.raw(`excluded."${column.name}"`)),
    sql`, `
  );
  return sql`(${current}) IS DISTINCT FROM (${incoming})`;
}
