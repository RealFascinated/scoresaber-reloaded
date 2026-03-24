import { z } from "zod";

export const accSaberScoreSortSchema = z.enum(["date", "ap", "acc", "complexity", "ranking"]);
export type AccSaberScoreSort = z.infer<typeof accSaberScoreSortSchema>;

export const accSaberScoreOrderSchema = z.enum(["asc", "desc"]);
export type AccSaberScoreOrder = z.infer<typeof accSaberScoreOrderSchema>;

export const accSaberScoreTypeSchema = z.enum(["overall", "true", "tech", "speed"]);
export type AccSaberScoreType = z.infer<typeof accSaberScoreTypeSchema>;
