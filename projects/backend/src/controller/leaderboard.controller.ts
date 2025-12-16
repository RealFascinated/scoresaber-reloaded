import { Elysia } from "elysia";
import { z } from "zod";
import { MapDifficultySchema } from "../../../common/src/score/map-difficulty";
import { MapCharacteristicSchema } from "../../../common/src/types/map-characteristic";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { LeaderboardHmdService } from "../service/leaderboard/leaderboard-hmd.service";
import { ScoreSaberApiService } from "../service/scoresaber-api.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/search",
        async ({
          query: { page, ranked, qualified, verified, category, minStar, maxStar, sort, search },
        }) => {
          return await ScoreSaberApiService.lookupLeaderboards(page, {
            search,
            ranked,
            qualified,
            verified,
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
            verified: z.coerce.boolean().optional(),
            category: z.coerce.number().optional(),
            minStar: z.coerce.number().optional(),
            maxStar: z.coerce.number().optional(),
            sort: z.coerce.number().optional(),
            search: z.coerce.string().optional(),
          }),
          detail: {
            description: "Search for leaderboards",
          },
        }
      )
      .get(
        "/by-id/:leaderboardId",
        async ({ params: { leaderboardId } }) => {
          return await LeaderboardCoreService.getLeaderboard(leaderboardId, {
            includeBeatSaver: true,
            includeStarChangeHistory: true,
          });
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            leaderboardId: z.string(),
          }),
          detail: {
            description: "Fetch a leaderboard by its id",
          },
        }
      )
      .get(
        "/by-hash/:hash/:difficulty/:characteristic",
        async ({ params: { hash, difficulty, characteristic } }) => {
          const data = await LeaderboardCoreService.getLeaderboardByHash(
            hash,
            difficulty,
            characteristic,
            {
              includeBeatSaver: true,
              includeStarChangeHistory: true,
            }
          );
          return data;
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            hash: z.string(),
            difficulty: MapDifficultySchema,
            characteristic: MapCharacteristicSchema,
          }),
          detail: {
            description: "Fetch a leaderboard by its hash, difficulty, and characteristic",
          },
        }
      )
      .get(
        "/plays-by-hmd/:leaderboardId",
        async ({ params: { leaderboardId } }) => {
          return LeaderboardHmdService.getPlaysByHmd(leaderboardId);
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            leaderboardId: z.string(),
          }),
          detail: {
            description: "Fetch the per hmd usage for a leaderboard",
          },
        }
      )
  );
}
