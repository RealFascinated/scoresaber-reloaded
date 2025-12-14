import { MiniRankingResponse } from "@ssr/common/response/around-player-response";
import { Elysia } from "elysia";
import { z } from "zod";
import MiniRankingService from "../service/mini-ranking.service";

export default function miniRankingController(app: Elysia) {
  return app.get(
    "/player/mini-ranking/:playerId",
    async ({ params: { playerId } }): Promise<MiniRankingResponse> => {
      return await MiniRankingService.getPlayerMiniRankings(playerId);
    },
    {
      tags: ["Player"],
      params: z.object({
        playerId: z.string(),
      }),
      detail: {
        description: "Fetch a player's mini ranking (global and country close rankings)",
      },
    }
  );
}
