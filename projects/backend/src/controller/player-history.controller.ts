import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { Elysia, NotFoundError } from "elysia";
import { z } from "zod";
import { PlayerHistoryService } from "../service/player/player-history.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerHistoryController(app: Elysia) {
  return app.get(
    "/player/history/:playerId",
    async ({ params: { playerId }, query: { startDate, endDate, includeFields } }): Promise<PlayerStatisticHistory> => {
      const player = await ScoreSaberService.getCachedPlayer(playerId, true);
      if (!player) {
        throw new NotFoundError(`Player "${playerId}" not found`);
      }

      const projection =
        includeFields && includeFields !== ""
          ? includeFields.split(",").reduce(
              (acc, field) => {
                acc[field] = 1;
                return acc;
              },
              {} as Record<string, string | number | boolean | object>
            )
          : undefined;

      return await PlayerHistoryService.getPlayerStatisticHistory(
        player,
        new Date(startDate),
        new Date(endDate),
        projection
      );
    },
    {
      tags: ["Player"],
      params: z.object({
        playerId: z.string(),
      }),
      query: z.object({
        startDate: z.string().default(new Date().toISOString()),
        endDate: z.string().default(getDaysAgoDate(50).toISOString()),
        includeFields: z.string().default("").optional(),
      }),
      detail: {
        description: "Fetch a player's statistics history",
      },
    }
  );
}
