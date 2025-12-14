import { DetailTypeSchema } from "@ssr/common/detail-type";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
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
        async ({ params: { leaderboardId }, query: { type } }): Promise<LeaderboardResponse> => {
          return await LeaderboardCoreService.getLeaderboard(leaderboardId, {
            beatSaverType: type,
            includeBeatSaver: true,
            includeStarChangeHistory: true,
          });
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            leaderboardId: z.string(),
          }),
          query: z.object({
            type: z.optional(DetailTypeSchema),
          }),
          detail: {
            description: "Fetch a leaderboard by its id",
          },
        }
      )
      .get(
        "/by-hash/:hash/:difficulty/:characteristic",
        async ({ params: { hash, difficulty, characteristic }, query: { type } }): Promise<LeaderboardResponse> => {
          const data = await LeaderboardCoreService.getLeaderboardByHash(hash, difficulty, characteristic, {
            type,
            includeBeatSaver: true,
            includeStarChangeHistory: true,
          });
          return data;
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            hash: z.string(),
            difficulty: MapDifficultySchema,
            characteristic: MapCharacteristicSchema,
          }),
          query: z.object({
            type: DetailTypeSchema.optional(),
          }),
          detail: {
            description: "Fetch a leaderboard by its hash, difficulty, and characteristic",
          },
        }
      )
      .get(
        "/plays-by-hmd/:leaderboardId",
        async ({ params: { leaderboardId } }): Promise<PlaysByHmdResponse> => {
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
