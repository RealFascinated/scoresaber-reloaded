import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardsPageResponseSchema } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import { ScoreSaberLeaderboardQueryFiltersSchema } from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { Elysia } from "elysia";
import { z } from "zod";
import BeatSaverService from "../../service/external/beatsaver.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        async ({ query: { page, ...filters } }) => {
          return await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(page, {
            ...filters,
          });
        },
        {
          tags: ["Leaderboard"],
          query: ScoreSaberLeaderboardQueryFiltersSchema.extend({
            page: z.coerce.number().default(1),
          }),
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
        async ({ params: { leaderboardId } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
          return await ScoreSaberLeaderboardsService.getStarChangeHistory(leaderboard);
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            leaderboardId: z.coerce.number(),
          }),
          detail: {
            description: "Fetch leaderboard star rating change history",
          },
        }
      )
      .get(
        "/by-id/:leaderboardId",
        async ({ params: { leaderboardId } }) => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
          const beatsaver = await BeatSaverService.getMap(
            leaderboard.songHash,
            leaderboard.difficulty.difficulty,
            leaderboard.difficulty.characteristic
          );
          return { leaderboard, beatsaver } as LeaderboardResponse;
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            leaderboardId: z.coerce.number(),
          }),
          detail: {
            description: "Fetch leaderboard details",
          },
        }
      )
      .get(
        "/by-hash/:hash/:difficulty/:characteristic",
        async ({ params: { hash, difficulty, characteristic } }) => {
          const [leaderboard, beatsaver] = await Promise.all([
            ScoreSaberLeaderboardsService.getLeaderboardByHash(hash, difficulty, characteristic),
            BeatSaverService.getMap(hash, difficulty, characteristic),
          ]);
          return { leaderboard, beatsaver } as LeaderboardResponse;
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            hash: z.string(),
            difficulty: MapDifficultySchema,
            characteristic: MapCharacteristicSchema,
          }),
          detail: {
            description: "Fetch leaderboard details",
          },
        }
      )
  );
}
