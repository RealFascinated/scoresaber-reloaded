import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardsPageResponseSchema } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import { ScoreSaberLeaderboardQueryFiltersSchema } from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { Elysia, t } from "elysia";
import BeatSaverService from "../../service/external/beatsaver.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        async ({ query: { page, realmId, ...filters } }) => {
          return await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
            page ?? 1,
            {
              ...filters,
              category: filters.category ?? "trending",
              sort: filters.sort ?? "desc",
            },
            realmId
          );
        },
        {
          tags: ["Leaderboard"],
          query: t.Composite([
            ScoreSaberLeaderboardQueryFiltersSchema,
            RealmQuerySchema,
            t.Object({
              page: t.Optional(t.Integer({ minimum: 1 })),
            }),
          ]),
          response: LeaderboardsPageResponseSchema,
          detail: {
            description: "Search ScoreSaber leaderboards",
          },
        }
      )
      .get(
        "/ranking-queue",
        async () => {
          return await ScoreSaberLeaderboardsService.getRankingQueueLeaderboards();
        },
        {
          tags: ["Leaderboard"],
          detail: {
            description: "Fetch the ScoreSaber ranking request queue",
          },
        }
      )
      .get(
        "/by-id/:leaderboardId/star-history",
        async ({ params: { leaderboardId }, query: { realmId } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId);
          return await ScoreSaberLeaderboardsService.getStarChangeHistory(leaderboard, realmId);
        },
        {
          tags: ["Leaderboard"],
          params: t.Object({
            leaderboardId: t.Integer({ minimum: 1 }),
          }),
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard star rating change history",
          },
        }
      )
      .get(
        "/by-id/:leaderboardId",
        async ({ params: { leaderboardId }, query: { realmId } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId);
          const beatsaver = await BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic
          );
          return { leaderboard, beatsaver } as LeaderboardResponse;
        },
        {
          tags: ["Leaderboard"],
          params: t.Object({
            leaderboardId: t.Integer({ minimum: 1 }),
          }),
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard details",
          },
        }
      )
      .get(
        "/by-hash/:hash/:difficulty/:characteristic",
        async ({ params: { hash, difficulty, characteristic }, query: { realmId } }) => {
          const [leaderboard, beatsaver] = await Promise.all([
            ScoreSaberLeaderboardsService.getLeaderboardByHash(hash, difficulty, characteristic, realmId),
            BeatSaverService.getMap(hash, difficulty, characteristic),
          ]);
          return { leaderboard, beatsaver } as LeaderboardResponse;
        },
        {
          tags: ["Leaderboard"],
          params: t.Object({
            hash: t.String(),
            difficulty: MapDifficultySchema,
            characteristic: MapCharacteristicSchema,
          }),
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard details",
          },
        }
      )
  );
}
