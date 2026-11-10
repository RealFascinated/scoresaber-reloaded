import { accSaberScoreSortSchema, accSaberScoreTypeSchema } from "@ssr/common/schemas/accsaber/query/query";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
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
        {
          tags: ["Scores"],
          params: t.Object({
            scoreId: t.Integer({ minimum: 1 }),
          }),
          query: RealmQuerySchema,
          response: PlayerScoreSchema,

          detail: {
            description: "Fetch a score",
          },
        },
        async ({ params: { scoreId }, query: { realmId } }) => {
          return PlayerScoresService.getScore(scoreId, realmId);
        }
      )
      .get(
        "/player/scoresaber/:playerId/:sort/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            page: t.Integer({ minimum: 1 }),
            sort: ScoreSaberScoreSortSchema,
          }),
          query: t.Object({
            search: t.Optional(t.String()),
          }),
          response: PlayerScoresPageResponseSchema,
          detail: {
            description: "Fetch player scores from ScoreSaber",
          },
        },
        async ({ params: { playerId, page, sort }, query: { search } }) => {
          return await PlayerScoresService.getScoreSaberLivePlayerScores(playerId, page, sort, search);
        }
      )
      .get(
        "/player/accsaber/:playerId/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            page: t.Integer({ minimum: 1 }),
          }),
          query: t.Object({
            sort: t.Optional(t.Union(accSaberScoreSortSchema.anyOf)),
            direction: t.Optional(t.Union(SortDirectionSchema.anyOf)),
            type: t.Optional(t.Union(accSaberScoreTypeSchema.anyOf)),
          }),
          response: AccSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch AccSaber player scores with optional BeatLeader replay URLs",
          },
        },
        async ({ params: { playerId, page }, query: { sort, direction, type } }) => {
          return await PlayerScoresService.getPlayerAccSaberScores(
            playerId,
            page,
            sort ?? "date",
            direction ?? "desc",
            type ?? "overall"
          );
        }
      )
      .get(
        "/player/ssr/:playerId/:field/:direction/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            field: ScoreSaberScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: t.Integer({ minimum: 1 }),
          }),
          query: PlayerScoresQuerySchema,
          response: PlayerScoresPageResponseSchema,
          detail: {
            description: "Fetch player scores",
          },
        },
        async ({ params: { playerId, page, field, direction }, query }) => {
          // Elysia types transform properties by their raw input; at runtime the query was decoded.
          return await PlayerScoresService.getScoreSaberPlayerScores(
            playerId,
            page,
            field,
            direction,
            query as PlayerScoresQuery
          );
        }
      )
      .get(
        "/player/medals/:playerId/:field/:direction/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            field: ScoreSaberMedalScoreSortFieldSchema,
            direction: SortDirectionSchema,
            page: t.Integer({ minimum: 1 }),
          }),
          query: PlayerScoresQuerySchema,
          response: MedalPlayerScoresPageResponseSchema,
          detail: {
            description: "Fetch player medal scores",
          },
        },
        async ({ params: { playerId, page, field, direction }, query }) => {
          return await PlayerScoresService.getScoreSaberPlayerMedalScores(
            playerId,
            page,
            field,
            direction,
            query as PlayerScoresQuery
          );
        }
      )
      .get(
        "/history-graph/:playerId/:leaderboardId",
        {
          tags: ["Scores"],
          params: t.Object({
            playerId: t.String(),
            leaderboardId: t.Integer({ minimum: 1 }),
          }),
          response: ScoreHistoryGraphSchema,
          detail: {
            description: "Fetch player score history graph",
          },
        },
        async ({ params: { playerId, leaderboardId } }) => {
          return await PlayerScoreHistoryService.getPlayerScoreHistoryGraph(playerId, leaderboardId);
        }
      )
      .get(
        "/leaderboard/:leaderboardId/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            leaderboardId: t.Integer({ minimum: 1 }),
            page: t.Integer({ minimum: 1 }),
          }),
          query: t.Evaluate(
            t.Intersect([
              RealmQuerySchema,
              t.Object({
                country: t.Optional(t.String()),
              }),
            ])
          ),
          detail: {
            description: "Fetch leaderboard scores",
          },
        },
        async ({ params: { leaderboardId, page }, query: { country, realmId } }) => {
          return await ScoreSaberLeaderboardScoresService.getLeaderboardScores(
            leaderboardId,
            page,
            country,
            realmId
          );
        }
      )
      .post(
        "/friend/leaderboard/:leaderboardId/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            leaderboardId: t.Integer({ minimum: 1 }),
            page: t.Integer({ minimum: 1 }),
          }),
          query: RealmQuerySchema,
          body: t.Object({
            friendIds: t.Array(t.String(), { minItems: 1, maxItems: SHARED_CONSTS.maxFriends + 1 }),
          }),
          response: ScoreSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch friends' scores for a leaderboard",
          },
        },
        async ({ params: { leaderboardId, page }, body: { friendIds }, query: { realmId } }) => {
          return await PlayerFriendScoresService.getFriendLeaderboardScores(
            friendIds,
            leaderboardId,
            page,
            realmId
          );
        }
      )
      .get(
        "/top/:page",
        {
          tags: ["Scores"],
          params: t.Object({
            page: t.Integer({ minimum: 1 }),
          }),
          query: t.Evaluate(
            t.Intersect([
              RealmQuerySchema,
              t.Object({
                limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
              }),
            ])
          ),
          response: TopScoresPageResponseSchema,
          detail: {
            description: "Fetch top scores",
          },
        },
        async ({ params: { page }, query: { limit, realmId } }) => {
          return await TopScoresService.getTopScores(page, limit, realmId);
        }
      )
  );
}
