import { MiniRankingResponse } from "@ssr/common/response/around-player-response";
import { Elysia, t } from "elysia";
import MiniRankingService from "../service/mini-ranking.service";

export default function miniRankingController(app: Elysia) {
  return app.get(
    "/player/mini-ranking/:playerId",
    async ({ params: { playerId } }): Promise<MiniRankingResponse> => {
      return await MiniRankingService.getPlayerMiniRankings(playerId);
    },
    {
      tags: ["Player"],
      params: t.Object({
        playerId: t.String({ required: true }),
      }),
      detail: {
        description: "Fetch a player's mini ranking (global and country close rankings)",
      },
    }
  );
}
