import { QuerySchema, SortDirection, SortDirectionSchema, SortField, SortFieldSchema } from "@ssr/common/types/score-query";
import { Elysia } from "elysia";
import { LeaderboardScoresService } from "../service/leaderboard/leaderboard-scores.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import { z } from "zod";
import { ScoreSaberScoreSortSchema } from "@ssr/common/score/score-sort";

export default function scoresController(app: Elysia) {
  return app.group("/scores", app =>
    app
      .get(
        "/:scoreId",
        async ({ params: { scoreId } }) => {
          return PlayerScoresService.getScore(scoreId);
        },
        {
          tags: ["Scores"],
          params: z.object({
            scoreId: z.string(),
          }),

          detail: {
            description: "Fetch a score by its ID",
          },
        }
      )
      .get(
        "/player/scoresaber/:playerId/:page/:sort",
        async ({ params: { playerId, page, sort }, query: { search, comparisonPlayerId } }) => {
          return (
            await PlayerScoresService.getScoreSaberLivePlayerScores(playerId, page, sort, search, comparisonPlayerId)
          ).toJSON();
        },
        {
          tags: ["Scores"],
          params: z.object({
            playerId: z.string(),
            page: z.coerce.number().default(1),
            sort: ScoreSaberScoreSortSchema,
          }),
          query: z.object({
            search: z.string().optional(),
            comparisonPlayerId: z.string().optional(),
          }),
          detail: {
            description: "Fetch a player's scores",
          },
        }
      )
      .get(
        "/player/:mode/:playerId/:field/:direction/:page",
        async ({ params: { mode, playerId, page, field, direction }, query }) => {
          return (
            await PlayerScoresService.getPlayerScores(
              mode,
              playerId,
              page,
              field as SortField,
              direction as SortDirection,
              query
            )
          ).toJSON();
        },
        {
          tags: ["Scores"],
          params: z.object({
            mode: z.enum(["ssr", "medals"]),
            playerId: z.string(),
            field: SortFieldSchema,
            direction: SortDirectionSchema,
            page: z.coerce.number().default(1),
          }),
          query: QuerySchema,
          detail: {
            description: "Lookup scores for a player",
          },
        }
      )
      .get(
        "/leaderboard/:leaderboardId/:page",
        async ({ params: { leaderboardId, page }, query: { country } }) => {
          return await LeaderboardScoresService.getLeaderboardScores(leaderboardId, page, country);
        },
        {
          tags: ["Scores"],
          params: z.object({
            leaderboardId: z.string(),
            page: z.coerce.number(),
          }),
          query: z.object({
            country: z.string().optional(),
          }),
          detail: {
            description: "Fetch the scores for a leaderboard",
          },
        }
      )
  );
}
