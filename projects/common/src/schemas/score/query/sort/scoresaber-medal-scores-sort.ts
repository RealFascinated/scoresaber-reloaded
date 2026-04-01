import z from "zod";

export const ScoreSaberMedalScoreSortFieldSchema = z.enum([
  "medals",
  "misses",
  "acc",
  "score",
  "maxcombo",
  "date",
]);
export type ScoreSaberMedalScoreSortField = z.infer<typeof ScoreSaberMedalScoreSortFieldSchema>;
