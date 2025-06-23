import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { NotFoundError, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class PlayerHistoryController {
  @Get("/player/history/:id", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      startDate: t.Optional(t.String({ default: new Date().toISOString() })),
      endDate: t.Optional(t.String({ default: getDaysAgoDate(50).toISOString() })),
      includeFields: t.Optional(t.String({ default: "" })),
    }),
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

    return await PlayerService.getPlayerStatisticHistory(
      player,
      new Date(startDate),
      new Date(endDate),
      projection
    );
  }

  @Get("/player/history/calendar/:id/:year/:month", {
    config: {},
    tags: ["player"],
    params: t.Object({
      id: t.String({ required: true }),
      year: t.Number({ required: true }),
      month: t.Number({ required: true }),
    }),
  })
  public async getScoreCalendar({
    params: { id, year, month },
  }: {
    params: { id: string; year: number; month: number };
  }): Promise<ScoreCalendarData> {
    return await PlayerService.generateScoreCalendar(id, year, month);
  }
}
