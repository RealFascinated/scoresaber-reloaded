import { Type } from "typebox";
import { ScoreIdPathSchema } from "../route/route-params";

export const BeatLeaderScoreStatsParamsSchema = Type.Object({
  scoreId: ScoreIdPathSchema,
});

export const BeatLeaderReplayParamsSchema = Type.Object({
  scoreId: Type.String({ pattern: "^\\d+\\.bsor$" }),
});
