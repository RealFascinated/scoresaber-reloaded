import {
  accSaberScoreSortSchema,
  accSaberScoreTypeSchema,
} from "@ssr/common/schemas/accsaber/tokens/query/query";
import { PlayerScoresQuerySchema } from "@ssr/common/schemas/score/query/player-scores-query";
import { ScoreSaberMedalScoreSortFieldSchema } from "@ssr/common/schemas/score/query/sort/scoresaber-medal-scores-sort";
import { ScoreSaberScoreSortFieldSchema } from "@ssr/common/schemas/score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { ScoreSaberScoreSortSchema } from "@ssr/common/score/score-sort";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { Elysia } from "elysia";
import { z } from "zod";
import { ScoreSaberLeaderboardScoresService } from "../../service/leaderboard/scoresaber-leaderboard-scores.service";
import { PlayerFriendScoresService } from "../../service/player/player-friend-scores.service";
import { PlayerScoreHistoryService } from "../../service/player/player-score-history.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { TopScoresService } from "../../service/score/top-scores.service";

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
            scoreId: z.coerce.number(),
          }),

          detail: {
            description: "Fetch a score",
          },
        }
      )
      .get(
        "/player/scoresaber/:playerId/:sort/:page",
        async ({ params: { playerId, page, sort }, query: { search } }) => {
          return await PlayerScoresService.getScoreSaberLivePlayerScores(playerId, page, sort, search);
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
          }),
          detail: {
            description: "Fetch player scores from ScoreSaber",
          },
        }
      )
      .get(
        "/player/accsaber/:playerId/:page",
        async ({ params: { playerId, page }, query: { sort, direction, type } }) => {
          return await PlayerScoresService.getPlayerAccSaberScores(playerId, page, sort, direction, type);
        },
        {
          tags: ["Scores"],
          params: z.object({
            playerId: z.string(),
            page: z.coerce.number().default(1),
          }),
          query: z.object({
            sort: accSaberScoreSortSchema.default("date"),
            direction: SortDirectionSchema.default("desc"),
            type: accSaberScoreTypeSchema.default("overall"),
          }),
          detail: {
            description: "Fetch AccSaber player scores with optional BeatLeader replay URLs",
          },
        }
      )
      .get(
        "/player/ssr/:playerId/:field/:direction/:page",
        async ({ params: { playerId, page, field, direction }, query }) => {
          return await PlayerScoresService.getScoreSaberPlayerScores(playerId, page, field, direction, query);
        },
        {
          tags: ["Scores"],
          params: z.object({
            playerId: z.string(),
            field: ScoreSaberScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: z.coerce.number().default(1),
          }),
          query: PlayerScoresQuerySchema,
          detail: {
            description: "Fetch player scores",
          },
        }
      )
      .get(
        "/player/medals/:playerId/:field/:direction/:page",
        async ({ params: { playerId, page, field, direction }, query }) => {
          return await PlayerScoresService.getScoreSaberPlayerMedalScores(
            playerId,
            page,
            field,
            direction,
            query
          );
        },
        {
          tags: ["Scores"],
          params: z.object({
            playerId: z.string(),
            field: ScoreSaberMedalScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: z.coerce.number().default(1),
          }),
          query: PlayerScoresQuerySchema,
          detail: {
            description: "Fetch player medal scores",
          },
        }
      )
      .get(
        "/history-graph/:playerId/:leaderboardId",
        async ({ params: { playerId, leaderboardId } }) => {
          return await PlayerScoreHistoryService.getPlayerScoreHistoryGraph(playerId, leaderboardId);
        },
        {
          tags: ["Scores"],
          params: z.object({
            playerId: z.string(),
            leaderboardId: z.coerce.number(),
          }),
          detail: {
            description: "Fetch player score history graph",
          },
        }
      )
      .get(
        "/leaderboard/:leaderboardId/:page",
        async ({ params: { leaderboardId, page }, query: { country } }) => {
          return await ScoreSaberLeaderboardScoresService.getLeaderboardScores(leaderboardId, page, country);
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
        async ({ params: { page, limit } }) => {
          return await TopScoresService.getTopScores(page, limit);
        },
        {
          tags: ["Scores"],
          params: z.object({
            page: z.coerce.number().default(1),
            limit: z.coerce.number().min(1).max(50).default(25),
          }),
          detail: {
            description: "Fetch top scores",
          },
        }
      )
  );
}
