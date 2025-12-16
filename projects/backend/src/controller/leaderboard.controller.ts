import { Elysia } from "elysia";
import { z } from "zod";
import { MapDifficultySchema } from "../../../common/src/score/map-difficulty";
import { MapCharacteristicSchema } from "../../../common/src/types/map-characteristic";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { LeaderboardHmdService } from "../service/leaderboard/leaderboard-hmd.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
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
