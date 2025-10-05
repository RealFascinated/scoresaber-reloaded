import { z } from "zod";

const sortField = z.enum(["pp", "misses", "acc", "score", "maxcombo", "date", "starcount"]);
const sortDirection = z.enum(["asc", "desc"]);
const filters = z
  .object({
    rankedOnly: z.boolean().optional(),
    unrankedOnly: z.boolean().optional(),
    passedOnly: z.boolean().optional(),
    hmd: z.string().optional()
  })
  .optional();

const sortSchema = z.object({
  field: sortField,
  direction: sortDirection,
  filters,
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
