import { Type } from "typebox";
import { ScoreSaberScoreSortSchema } from "../../score/score-sort";
import { SHARED_CONSTS } from "../../shared-consts";
import { accSaberScoreSortSchema, accSaberScoreTypeSchema } from "../accsaber/query/query";
import { RealmQuerySchema } from "../realm/realm-query";
import {
  LeaderboardIdPathSchema,
  PagePathSchema,
  PlayerIdPathSchema,
  ScoreIdPathSchema,
} from "../route/route-params";
import { ScoreSaberMedalScoreSortFieldSchema } from "./query/sort/scoresaber-medal-scores-sort";
import { ScoreSaberScoreSortFieldSchema } from "./query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "./query/sort/sort-direction";

export const ScoreByIdParamsSchema = Type.Object({
  scoreId: ScoreIdPathSchema,
});

export const ScoreSaberLivePlayerScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  page: PagePathSchema,
  sort: ScoreSaberScoreSortSchema,
});

export const ScoreSaberLivePlayerScoresQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
});

export const AccSaberPlayerScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  page: PagePathSchema,
});

export const AccSaberPlayerScoresQuerySchema = Type.Object({
  sort: Type.Optional(accSaberScoreSortSchema),
  direction: Type.Optional(SortDirectionSchema),
  type: Type.Optional(accSaberScoreTypeSchema),
});

export const PlayerScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  field: ScoreSaberScoreSortFieldSchema,
  direction: SortDirectionSchema,
  page: PagePathSchema,
});

export const PlayerMedalScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  field: ScoreSaberMedalScoreSortFieldSchema,
  direction: SortDirectionSchema,
  page: PagePathSchema,
});

export const PlayerScoreHistoryGraphParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  leaderboardId: LeaderboardIdPathSchema,
});

export const LeaderboardScoresQuerySchema = Type.Object({
  ...RealmQuerySchema.properties,
  country: Type.Optional(Type.String()),
});

export const FollowingLeaderboardScoresBodySchema = Type.Object({
  followingIds: Type.Array(Type.String(), { minItems: 1, maxItems: SHARED_CONSTS.maxFollowing + 1 }),
});

export const TopScoresParamsSchema = Type.Object({
  page: PagePathSchema,
});

export const TopScoresQuerySchema = Type.Object({
  ...RealmQuerySchema.properties,
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
});
