import { z } from "zod";

export const ScoreSaberLeaderboardStatusSchema = z.enum(["Unranked", "Ranked", "Qualified"]);
export type ScoreSaberLeaderboardStatus = z.infer<typeof ScoreSaberLeaderboardStatusSchema>;
