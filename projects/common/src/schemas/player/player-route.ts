import { Type } from "typebox";
import { DetailTypeSchema } from "../../detail-type";
import { RealmQuerySchema } from "../realm/realm-query";
import { LeaderboardIdPathSchema, PagePathSchema, PlayerIdPathSchema } from "../route/route-params";

export const PlayerSearchQuerySchema = Type.Object({
  // Allow empty string searches (`?query=`) but cap length to avoid unbounded query costs.
  query: Type.Optional(Type.String({ maxLength: 64 })),
});

export const PlayerProfileQuerySchema = Type.Object({
  ...RealmQuerySchema.properties,
  type: Type.Optional(DetailTypeSchema),
});

export const PlayerHistoryQuerySchema = Type.Object({
  ...RealmQuerySchema.properties,
  count: Type.Optional(
    Type.Codec(
      Type.Refine(
        Type.Union([Type.String(), Type.Number(), Type.Undefined()]),
        v => {
          const n = v === "" || v === undefined ? 50 : Number(v);
          return n === -1 || (Number.isInteger(n) && n >= 1);
        },
        () => "Expected -1 or an integer >= 1"
      )
    )
      .Decode(v => (v === "" || v === undefined ? 50 : Number(v)))
      .Encode(v => v)
  ),
});

export const PlayerLeaderboardScoreHistoryParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  leaderboardId: LeaderboardIdPathSchema,
  page: PagePathSchema,
});
