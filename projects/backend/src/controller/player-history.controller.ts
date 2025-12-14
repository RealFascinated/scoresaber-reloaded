import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { Elysia, NotFoundError, t } from "elysia";
import { PlayerHistoryService } from "../service/player/player-history.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerHistoryController(app: Elysia) {
  return app.get(
    "/player/history/:id",
    async ({ params: { id }, query: { startDate, endDate, includeFields } }): Promise<PlayerStatisticHistory> => {
      const player = await ScoreSaberService.getCachedPlayer(id, true);
      if (!player) {
        throw new NotFoundError(`Player "${id}" not found`);
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
      params: t.Object({
        id: t.String({ required: true }),
      }),
      query: t.Object({
        startDate: t.String({ default: new Date().toISOString() }),
        endDate: t.String({ default: getDaysAgoDate(50).toISOString() }),
        includeFields: t.Optional(t.String({ default: "" })),
      }),
      detail: {
        description: "Fetch a player's statistics history",
      },
    }
  );
}
