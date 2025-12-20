import { z } from "zod";
import { HmdSchema } from "../hmds";

export const SortFieldSchema = z.enum([
  "pp",
  "medals",
  "misses",
  "acc",
  "score",
  "maxcombo",
  "date",
]);
export const SortDirectionSchema = z.enum(["asc", "desc"]);
export const QuerySchema = z.object({
  search: z.string().optional(),
  hmd: HmdSchema.optional(),
  includePlayers: z
    .union([z.string(), z.array(z.string()), z.undefined()])
    .transform((v): string[] | undefined => (v === undefined ? undefined : typeof v === "string" ? v.split(",") : v))
    .optional(),
});

export type SortField = z.infer<typeof SortFieldSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;
export type ScoreQuery = z.infer<typeof QuerySchema>;
