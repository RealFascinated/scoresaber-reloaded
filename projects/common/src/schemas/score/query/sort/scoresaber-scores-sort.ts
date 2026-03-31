import z from "zod";

export const ScoreSaberScoreSortFieldSchema = z.enum(["pp", "misses", "acc", "score", "maxcombo", "date"]);
export type ScoreSaberScoreSortField = z.infer<typeof ScoreSaberScoreSortFieldSchema>;
