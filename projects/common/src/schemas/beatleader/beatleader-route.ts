import { Type } from "typebox";
import { ScoreIdPathSchema } from "../route/route-params";

export const BeatLeaderScoreStatsParamsSchema = Type.Object({
  scoreId: ScoreIdPathSchema,
});

export const BeatLeaderReplayParamsSchema = Type.Object({
  scoreId: Type.String({ pattern: "^\\d+\\.bsor$" }),
});

export const BeatLeaderOverlayDataParamsSchema = Type.Object({
  scoreId: ScoreIdPathSchema,
});

export const BeatLeaderPlayerOverlayDataParamsSchema = Type.Object({
  playerId: Type.String({ minLength: 1, maxLength: 32 }),
  hash: Type.String({ minLength: 1, maxLength: 64 }),
  difficulty: Type.String({ minLength: 1, maxLength: 64 }),
  characteristic: Type.String({ minLength: 1, maxLength: 128 }),
});

export const BeatLeaderOverlayRatingsParamsSchema = Type.Object({
  hash: Type.String({ minLength: 1, maxLength: 64 }),
  difficulty: Type.String({ minLength: 1, maxLength: 64 }),
  characteristic: Type.String({ minLength: 1, maxLength: 128 }),
});

export const BeatLeaderOverlayPlayerParamsSchema = Type.Object({
  playerId: Type.String({ minLength: 1, maxLength: 32 }),
});
