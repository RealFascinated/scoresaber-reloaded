import { Type } from "typebox";
import { MapCharacteristicSchema } from "../map/map-characteristic";
import { MapDifficultySchema } from "../map/map-difficulty";
import { RealmQuerySchema } from "../realm/realm-query";
import { ScoreSaberLeaderboardQueryFiltersSchema } from "../scoresaber/leaderboard/query-filters";

export const LeaderboardSearchQuerySchema = Type.Object({
  ...ScoreSaberLeaderboardQueryFiltersSchema.properties,
  ...RealmQuerySchema.properties,
  page: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const LeaderboardByHashParamsSchema = Type.Object({
  hash: Type.String(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});
