import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { NotFoundError, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerHistoryService } from "../service/player/player-history.service";

@Controller("")
export default class PlayerHistoryController {
  @Get("/player/history/:id", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      startDate: t.Optional(t.String({ default: new Date().toISOString() })),
      endDate: t.Optional(t.String({ default: getDaysAgoDate(50).toISOString() })),
      includeFields: t.Optional(t.String({ default: "" })),
    }),
    detail: {
      description: "Fetch a player's statistics history",
    },
  })
  public async getPlayerHistory({
    params: { id },
    query: { startDate, endDate, includeFields },
  }: {
    params: { id: string };
    query: { startDate: string; endDate: string; includeFields: string };
  }): Promise<PlayerStatisticHistory> {
    const player = await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayer(id);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const projection =
      includeFields !== ""
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
  }
}
