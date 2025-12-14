import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { Elysia, t } from "elysia";
import { z } from "zod";
import { MapDifficultySchema } from "../../../common/src/score/map-difficulty";
import { MapCharacteristicSchema } from "../../../common/src/types/map-characteristic";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { LeaderboardHmdService } from "../service/leaderboard/leaderboard-hmd.service";

export default function leaderboardController(app: Elysia) {
  return app.group("/leaderboard", app =>
    app
      .get(
        "/by-id/:id",
        async ({ params: { id }, query: { type } }): Promise<LeaderboardResponse> => {
          return await LeaderboardCoreService.getLeaderboard(id, {
            beatSaverType: type,
            includeBeatSaver: true,
            includeStarChangeHistory: true,
          });
        },
        {
          tags: ["Leaderboard"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          query: t.Object({
            type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
          }),
          detail: {
            description: "Fetch a leaderboard by its id",
          },
        }
      )
      .get(
        "/by-hash/:id/:difficulty/:characteristic",
        async ({ params: { id, difficulty, characteristic }, query: { type } }): Promise<LeaderboardResponse> => {
          const data = await LeaderboardCoreService.getLeaderboardByHash(id, difficulty, characteristic, {
            type,
            includeBeatSaver: true,
            includeStarChangeHistory: true,
          });
          return data;
        },
        {
          tags: ["Leaderboard"],
          params: z.object({
            id: z.string(),
            difficulty: MapDifficultySchema,
            characteristic: MapCharacteristicSchema,
          }),
          query: t.Object({
            type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
          }),
          detail: {
            description: "Fetch a leaderboard by its hash, difficulty, and characteristic",
          },
        }
      )
      .get(
        "/plays-by-hmd/:id",
        async ({ params: { id } }): Promise<PlaysByHmdResponse> => {
          return LeaderboardHmdService.getPlaysByHmd(id);
        },
        {
          tags: ["Leaderboard"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          detail: {
            description: "Fetch the per hmd usage for a leaderboard",
          },
        }
      )
  );
}
