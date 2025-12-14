import { z } from "zod";

export const ScoreSaberScoreSortSchema = z.enum(["top", "recent"]);
export type ScoreSaberScoreSort = z.infer<typeof ScoreSaberScoreSortSchema>;
