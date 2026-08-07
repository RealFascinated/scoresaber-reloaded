import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberV2MetadataTokenSchema } from "../metadata";
import { ScoreSaberV2LeaderboardDifficultyTokenSchema } from "./leaderboard-difficulty";
import { ScoreSaberV2LeaderboardMapTokenSchema } from "./leaderboard-map";
import { ScoreSaberV2LeaderboardRealmTokenSchema } from "./leaderboard-realm";

export const ScoreSaberV2LeaderboardPageTokenSchema = Type.Object({
  id: Type.Number(),
  map: ScoreSaberV2LeaderboardMapTokenSchema,
  difficulty: ScoreSaberV2LeaderboardDifficultyTokenSchema,
  maxScore: Type.Number(),
  totalScores: Type.Number(),
  dailyScores: Type.Number(),
  createdAt: Type.String(),
  realm: ScoreSaberV2LeaderboardRealmTokenSchema,
});

export type ScoreSaberV2LeaderboardPageToken = StaticDecode<typeof ScoreSaberV2LeaderboardPageTokenSchema>;

export const ScoreSaberV2LeaderboardsPageTokenSchema = Type.Object({
  data: Type.Array(ScoreSaberV2LeaderboardPageTokenSchema),
  metadata: ScoreSaberV2MetadataTokenSchema,
});

export type ScoreSaberV2LeaderboardsPageToken = StaticDecode<typeof ScoreSaberV2LeaderboardsPageTokenSchema>;
