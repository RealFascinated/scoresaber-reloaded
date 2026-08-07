import { accSaberScoreSortSchema, accSaberScoreTypeSchema } from "@ssr/common/schemas/accsaber/query/query";
import { AccSaberScoresPageResponseSchema } from "@ssr/common/schemas/response/score/accsaber-scores-page";
import {
  MedalPlayerScoresPageResponseSchema,
  PlayerScoreSchema,
  PlayerScoresPageResponseSchema,
} from "@ssr/common/schemas/response/score/player-scores";
import { ScoreHistoryGraphSchema } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberScoresPageResponseSchema } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { TopScoresPageResponseSchema } from "@ssr/common/schemas/response/score/top-scores";
import {
  PlayerScoresQuery,
  PlayerScoresQuerySchema,
} from "@ssr/common/schemas/score/query/player-scores-query";
import { ScoreSaberMedalScoreSortFieldSchema } from "@ssr/common/schemas/score/query/sort/scoresaber-medal-scores-sort";
import { ScoreSaberScoreSortFieldSchema } from "@ssr/common/schemas/score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { ScoreSaberScoreSortSchema } from "@ssr/common/score/score-sort";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { Elysia, t } from "elysia";
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
          params: t.Object({
            scoreId: t.Number(),
          }),
          response: PlayerScoreSchema,

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
          params: t.Object({
            playerId: t.String(),
            page: t.Number({ default: 1 }),
            sort: ScoreSaberScoreSortSchema,
          }),
          query: t.Object({
            search: t.Optional(t.String()),
          }),
          response: PlayerScoresPageResponseSchema,
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
          params: t.Object({
            playerId: t.String(),
            page: t.Number({ default: 1 }),
          }),
          query: t.Object({
            sort: t.Union(accSaberScoreSortSchema.anyOf, { default: "date" }),
            direction: t.Union(SortDirectionSchema.anyOf, { default: "desc" }),
            type: t.Union(accSaberScoreTypeSchema.anyOf, { default: "overall" }),
          }),
          response: AccSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch AccSaber player scores with optional BeatLeader replay URLs",
          },
        }
      )
      .get(
        "/player/ssr/:playerId/:field/:direction/:page",
        async ({ params: { playerId, page, field, direction }, query }) => {
          // Elysia types transform properties by their raw input; at runtime the query was decoded.
          return await PlayerScoresService.getScoreSaberPlayerScores(
            playerId,
            page,
            field,
            direction,
            query as PlayerScoresQuery
          );
        },
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            field: ScoreSaberScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: t.Number({ default: 1 }),
          }),
          query: PlayerScoresQuerySchema,
          response: PlayerScoresPageResponseSchema,
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
            query as PlayerScoresQuery
          );
        },
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            field: ScoreSaberMedalScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: t.Number({ default: 1 }),
          }),
          query: PlayerScoresQuerySchema,
          response: MedalPlayerScoresPageResponseSchema,
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
          params: t.Object({
            playerId: t.String(),
            leaderboardId: t.Number(),
          }),
          response: ScoreHistoryGraphSchema,
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
          params: t.Object({
            leaderboardId: t.Number(),
            page: t.Number(),
          }),
          query: t.Object({
            country: t.Optional(t.String()),
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
          params: t.Object({
            leaderboardId: t.Number(),
            page: t.Number(),
          }),
          body: t.Object({
            friendIds: t.Array(t.String(), { minItems: 1, maxItems: SHARED_CONSTS.maxFriends + 1 }),
          }),
          response: ScoreSaberScoresPageResponseSchema,
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
          params: t.Object({
            page: t.Number({ default: 1 }),
            limit: t.Number({ minimum: 1, maximum: 50, default: 25 }),
          }),
          response: TopScoresPageResponseSchema,
          detail: {
            description: "Fetch top scores",
          },
        }
      )
  );
}
