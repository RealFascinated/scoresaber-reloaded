import { z } from "zod";

const sortField = z.enum(["pp", "misses", "acc", "score", "maxcombo", "date"]);
const sortDirection = z.enum(["asc", "desc"]);

const sortSchema = z.object({
  field: sortField,
  direction: sortDirection,
});

/**
 * Validates a sort object.
 *
 * @param sort the sort object to validate
 * @returns whether the sort object is valid
 */
export function validateSort(sort: unknown): sort is ScoreSort {
  return sortSchema.safeParse(sort).success;
}

export type ScoreSort = z.infer<typeof sortSchema>;
