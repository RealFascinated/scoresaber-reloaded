import { Type } from "typebox";

/** Path segment: ScoreSaber / BeatLeader player id. */
export const PlayerIdPathSchema = Type.String();

/** Path segment: 1-based page number. */
export const PagePathSchema = Type.Integer({ minimum: 1 });

/** Path segment: ScoreSaber leaderboard id. */
export const LeaderboardIdPathSchema = Type.Integer({ minimum: 1 });

/** Path segment: score id. */
export const ScoreIdPathSchema = Type.Integer({ minimum: 1 });

export const PlayerIdParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
});

export const LeaderboardIdParamsSchema = Type.Object({
  leaderboardId: LeaderboardIdPathSchema,
});

export const LeaderboardPageParamsSchema = Type.Object({
  leaderboardId: LeaderboardIdPathSchema,
  page: PagePathSchema,
});

export const PagePathParamsSchema = Type.Object({
  page: PagePathSchema,
});
