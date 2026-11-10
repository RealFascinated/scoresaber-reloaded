import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import {
  LeaderboardByHashParamsSchema,
  LeaderboardSearchQuerySchema,
} from "@ssr/common/schemas/leaderboard/leaderboard-route";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardsPageResponseSchema } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import { LeaderboardIdParamsSchema } from "@ssr/common/schemas/route/route-params";
import { Elysia } from "elysia";
import BeatSaverService from "../../service/external/beatsaver.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        {
          tags: ["Leaderboard"],
          query: LeaderboardSearchQuerySchema,
          response: LeaderboardsPageResponseSchema,
          detail: {
            description: "Search ScoreSaber leaderboards",
          },
        },
        async ({ query: { page, realmId = DEFAULT_REALM_ID, ...filters } }) => {
          return await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
            page ?? 1,
            {
              ...filters,
              category: filters.category ?? "trending",
              sort: filters.sort ?? "desc",
            },
            realmId
          );
        }
      )
      .get(
        "/ranking-queue",
        {
          tags: ["Leaderboard"],
          detail: {
            description: "Fetch the ScoreSaber ranking request queue",
          },
        },
        async () => {
          return await ScoreSaberLeaderboardsService.getRankingQueueLeaderboards();
        }
      )
      .get(
        "/by-id/:leaderboardId/star-history",
        {
          tags: ["Leaderboard"],
          params: LeaderboardIdParamsSchema,
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard star rating change history",
          },
        },
        async ({ params: { leaderboardId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId);
          return await ScoreSaberLeaderboardsService.getStarChangeHistory(leaderboard, realmId);
        }
      )
      .get(
        "/by-id/:leaderboardId",
        {
          tags: ["Leaderboard"],
          params: LeaderboardIdParamsSchema,
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard details",
          },
        },
        async ({ params: { leaderboardId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId, realmId);
          const beatsaver = await BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic
          );
          return { leaderboard, beatsaver } as LeaderboardResponse;
        }
      )
      .get(
        "/by-hash/:hash/:difficulty/:characteristic",
        {
          tags: ["Leaderboard"],
          params: LeaderboardByHashParamsSchema,
          query: RealmQuerySchema,
          detail: {
            description: "Fetch leaderboard details",
          },
        },
        async ({ params: { hash, difficulty, characteristic }, query: { realmId = DEFAULT_REALM_ID } }) => {
          const [leaderboard, beatsaver] = await Promise.all([
            ScoreSaberLeaderboardsService.getLeaderboardByHash(hash, difficulty, characteristic, realmId),
            BeatSaverService.getMap(hash, difficulty, characteristic),
          ]);
          return { leaderboard, beatsaver } as LeaderboardResponse;
        }
      )
  );
}
