import { Type, type StaticDecode } from "typebox";
import { PlayerScoreSchema } from "../score/player-scores";

export const PinnedScoreSchema = Type.Object({
  score: PlayerScoreSchema.properties.score,
  leaderboard: PlayerScoreSchema.properties.leaderboard,
  beatSaver: PlayerScoreSchema.properties.beatSaver,
  /** The comment the player left on the pin, if any. */
  message: Type.Optional(Type.String()),
});
export type PinnedScore = StaticDecode<typeof PinnedScoreSchema>;

export const PinnedScoresResponseSchema = Type.Object({
  /** The pinned scores, in the order they were pinned. */
  items: Type.Array(PinnedScoreSchema),
});
export type PinnedScoresResponse = StaticDecode<typeof PinnedScoresResponseSchema>;

export const PinnedScoreIdsResponseSchema = Type.Object({
  /** The ids of the scores the user pinned, in the order they were pinned. */
  scoreIds: Type.Array(Type.Integer()),
});
export type PinnedScoreIdsResponse = StaticDecode<typeof PinnedScoreIdsResponseSchema>;

export const PinnedScoreMessageBodySchema = Type.Object({
  /** The comment to show on the pin. An empty message removes it. */
  message: Type.String({ maxLength: 200 }),
});
export type PinnedScoreMessageBody = StaticDecode<typeof PinnedScoreMessageBodySchema>;
