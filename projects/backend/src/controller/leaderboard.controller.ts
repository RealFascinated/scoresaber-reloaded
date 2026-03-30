import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { Elysia } from "elysia";
import { z } from "zod";
import BeatSaverService from "../service/beatsaver.service";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { LeaderboardRankingService } from "../service/leaderboard/leaderboard-ranking.service";
import { ScoreSaberApiService } from "../service/scoresaber-api.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        async ({ query: { page, ranked, qualified, category, minStar, maxStar, sort, query } }) => {
          return await LeaderboardCoreService.lookupLeaderboards(page, {
            query,
            ranked,
            qualified,
            category,
            stars: {
              min: minStar,
              max: maxStar,
            },
            sort,
          });
        },
        {
          tags: ["Leaderboard"],
          query: z.object({
            page: z.coerce.number().default(1),
            ranked: z.coerce.boolean().optional(),
            qualified: z.coerce.boolean().optional(),
            category: z.coerce.number().optional(),
            minStar: z.coerce.number().optional(),
            maxStar: z.coerce.number().optional(),
            sort: z.coerce.number().optional(),
            query: z.coerce.string().optional(),
          }),
          detail: {
            description: "Search ScoreSaber leaderboards",
          },
        }
      )
      .get(
        "/ranking-queue",
        async () => {
          return await ScoreSaberApiService.lookupRankingRequests();
        },
        {
          tags: ["Leaderboard"],
          detail: {
            description: "Fetch the ScoreSaber ranking request queue",
          },
        }
      )
      .get(
        "/by-id/:leaderboardId",
        async ({ params: { leaderboardId } }) => {
          const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);
          return {
            leaderboard: leaderboard,
            beatsaver: await BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic,
              "full"
            ),
            starChangeHistory: await LeaderboardRankingService.fetchStarChangeHistory(leaderboard),
          } as LeaderboardResponse;
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
          const leaderboard = await LeaderboardCoreService.getLeaderboardByHash(
            hash,
            difficulty,
            characteristic
          );
          return {
            leaderboard: leaderboard,
            beatsaver: await BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic,
              "full"
            ),
            starChangeHistory: await LeaderboardRankingService.fetchStarChangeHistory(leaderboard),
          } as LeaderboardResponse;
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
