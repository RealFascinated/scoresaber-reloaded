import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { LeaderboardsPageResponseSchema } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import { ScoreSaberLeaderboardSearchFiltersSchema } from "@ssr/common/schemas/scoresaber/leaderboard/search-filters";
import { Elysia } from "elysia";
import { z } from "zod";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import BeatSaverService from "../../service/external/beatsaver.service";
import { ScoreSaberApiService } from "../../service/external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        async ({ query: { page, ...filters } }) => {
          return await ScoreSaberLeaderboardsRepository.lookupLeaderboards(page, {
            ...filters,
          });
        },
        {
          tags: ["Leaderboard"],
          query: ScoreSaberLeaderboardSearchFiltersSchema.extend({
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
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
          const [beatsaver, starChangeHistory] = await Promise.all([
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
            ScoreSaberLeaderboardsService.fetchStarChangeHistory(leaderboard),
          ]);
          return { leaderboard, beatsaver, starChangeHistory } as LeaderboardResponse;
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
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboardByHash(
            hash,
            difficulty,
            characteristic
          );
          const [beatsaver, starChangeHistory] = await Promise.all([
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
            ScoreSaberLeaderboardsService.fetchStarChangeHistory(leaderboard),
          ]);
          return { leaderboard, beatsaver, starChangeHistory } as LeaderboardResponse;
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
