import { SortDirection, SortField } from "@ssr/common/types/score-query";
import { Elysia, t } from "elysia";
import { LeaderboardScoresService } from "../service/leaderboard/leaderboard-scores.service";
import { PlayerScoresService } from "../service/player/player-scores.service";

export default function scoresController(app: Elysia) {
  return app.group("/scores", app =>
    app
      .get(
        "/:id",
        async ({ params: { id } }) => {
          return PlayerScoresService.getScore(id);
        },
        {
          tags: ["Scores"],
          params: t.Object({
            id: t.String({ required: true }),
          }),

          detail: {
            description: "Fetch a score by its ID",
          },
        }
      )
      .get(
        "/player/scoresaber/:id/:page/:sort",
        async ({ params: { id, page, sort }, query: { search, comparisonPlayerId } }) => {
          return (
            await PlayerScoresService.getScoreSaberLivePlayerScores(id, page, sort, search, comparisonPlayerId)
          ).toJSON();
        },
        {
          tags: ["Scores"],
          params: t.Object({
            id: t.String({ required: true }),
            page: t.Number({ required: true }),
            sort: t.String({ required: true }),
          }),
          query: t.Object({
            search: t.Optional(t.String()),
            comparisonPlayerId: t.Optional(t.String()),
          }),
          detail: {
            description: "Fetch a player's scores",
          },
        }
      )
      .get(
        "/player/:mode/:id/:field/:direction/:page",
        async ({ params: { mode, id, page, field, direction }, query }) => {
          return (
            await PlayerScoresService.getPlayerScores(
              mode as "ssr" | "medals",
              id,
              page,
              field as SortField,
              direction as SortDirection,
              query
            )
          ).toJSON();
        },
        {
          tags: ["Scores"],
          params: t.Object({
            mode: t.String({ required: true }),
            id: t.String({ required: true }),
            field: t.String({ required: true }),
            direction: t.String({ required: true }),
            page: t.Number({ required: true }),
          }),
          query: t.Optional(
            t.Object({
              search: t.Optional(t.String()),
              hmd: t.Optional(t.String()),
            })
          ),
          detail: {
            description: "Lookup scores for a player",
          },
        }
      )
      .get(
        "/leaderboard/:id/:page",
        async ({ params: { id, page }, query: { country } }) => {
          return await LeaderboardScoresService.getLeaderboardScores(id, page, country);
        },
        {
          tags: ["Scores"],
          params: t.Object({
            id: t.String({ required: true }),
            page: t.Number({ required: true }),
          }),
          query: t.Object({
            country: t.Optional(t.String()),
          }),
          detail: {
            description: "Fetch the scores for a leaderboard",
          },
        }
      )
  );
}
