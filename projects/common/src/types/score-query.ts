import { z } from "zod";

const sortField = z.enum(["pp", "medals", "misses", "acc", "score", "maxcombo", "date"]);
const sortDirection = z.enum(["asc", "desc"]);
const query = z.object({
  search: z.string().optional(),
  hmd: z.string().optional(),
});

export type SortField = z.infer<typeof sortField>;
export type SortDirection = z.infer<typeof sortDirection>;
export type ScoreQuery = z.infer<typeof query>;
