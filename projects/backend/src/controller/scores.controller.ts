import { ScoreSaberScoreSortSchema } from "@ssr/common/score/score-sort";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import {
  QuerySchema,
  SortDirection,
  SortDirectionSchema,
  SortField,
  SortFieldSchema,
} from "@ssr/common/types/score-query";
import { Elysia } from "elysia";
import { z } from "zod";
import { LeaderboardScoresService } from "../service/leaderboard/leaderboard-scores.service";
import { PlayerFriendScoresService } from "../service/player/player-friend-scores.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import { TopScoresService } from "../service/score/top-scores.service";

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
            description: "Fetch a score",
          },
        }
      )
      .get(
        "/player/scoresaber/:playerId/:sort/:page",
        async ({ params: { playerId, page, sort }, query: { search, comparisonPlayerId } }) => {
          return await PlayerScoresService.getScoreSaberLivePlayerScores(
            playerId,
            page,
            sort,
            search,
            comparisonPlayerId
          );
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
            description: "Fetch player scores from ScoreSaber",
          },
        }
      )
      .get(
        "/player/:mode/:playerId/:field/:direction/:page",
        async ({ params: { mode, playerId, page, field, direction }, query }) => {
          return await PlayerScoresService.getPlayerScores(
            mode,
            playerId,
            page,
            field as SortField,
            direction as SortDirection,
            query
          );
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
            description: "Fetch player scores",
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
            leaderboardId: z.coerce.number(),
            page: z.coerce.number(),
          }),
          query: z.object({
            country: z.string().optional(),
          }),
          detail: {
            description: "Fetch leaderboard scores",
          },
        }
      )
      .post(
        "/friend/leaderboard/:leaderboardId/:page",
        async ({ params: { leaderboardId, page }, body: { friendIds } }) => {
          return await PlayerFriendScoresService.getFriendLeaderboardScores(friendIds, leaderboardId, page);
        },
        {
          tags: ["Scores"],
          params: z.object({
            leaderboardId: z.coerce.number(),
            page: z.coerce.number(),
          }),
          body: z.object({
            friendIds: z
              .array(z.string())
              .min(1)
              .max(SHARED_CONSTS.maxFriends + 1),
          }),
          detail: {
            description: "Fetch friends' scores for a leaderboard",
          },
        }
      )
      .get(
        "/top/:page",
        async ({ params: { page } }) => {
          return await TopScoresService.getTopScores(page);
        },
        {
          tags: ["Scores"],
          params: z.object({
            page: z.coerce.number().default(1),
          }),
          detail: {
            description: "Fetch top scores",
          },
        }
      )
  );
}
