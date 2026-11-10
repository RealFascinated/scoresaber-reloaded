import { DEFAULT_REALM_ID } from "@ssr/common/realm";
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
import { LeaderboardPageParamsSchema } from "@ssr/common/schemas/route/route-params";
import {
  PlayerScoresQuery,
  PlayerScoresQuerySchema,
} from "@ssr/common/schemas/score/query/player-scores-query";
import {
  AccSaberPlayerScoresParamsSchema,
  AccSaberPlayerScoresQuerySchema,
  FollowingLeaderboardScoresBodySchema,
  LeaderboardScoresQuerySchema,
  PlayerMedalScoresParamsSchema,
  PlayerScoreHistoryGraphParamsSchema,
  PlayerScoresParamsSchema,
  ScoreByIdParamsSchema,
  ScoreSaberLivePlayerScoresParamsSchema,
  ScoreSaberLivePlayerScoresQuerySchema,
  TopScoresParamsSchema,
  TopScoresQuerySchema,
} from "@ssr/common/schemas/score/scores-route";
import { Elysia } from "elysia";
import { ScoreSaberLeaderboardScoresService } from "../../service/leaderboard/scoresaber-leaderboard-scores.service";
import { PlayerFollowingScoresService } from "../../service/player/player-following-scores.service";
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
          params: ScoreByIdParamsSchema,
          query: RealmQuerySchema,
          response: PlayerScoreSchema,

          detail: {
            description: "Fetch a score",
          },
        },
        async ({ params: { scoreId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          return PlayerScoresService.getScore(scoreId, realmId);
        }
      )
      .get(
        "/player/scoresaber/:playerId/:sort/:page",
        {
          tags: ["Scores"],
          params: ScoreSaberLivePlayerScoresParamsSchema,
          query: ScoreSaberLivePlayerScoresQuerySchema,
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
          params: AccSaberPlayerScoresParamsSchema,
          query: AccSaberPlayerScoresQuerySchema,
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
          params: PlayerScoresParamsSchema,
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
          params: PlayerMedalScoresParamsSchema,
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
          params: PlayerScoreHistoryGraphParamsSchema,
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
          params: LeaderboardPageParamsSchema,
          query: LeaderboardScoresQuerySchema,
          detail: {
            description: "Fetch leaderboard scores",
          },
        },
        async ({ params: { leaderboardId, page }, query: { country, realmId = DEFAULT_REALM_ID } }) => {
          return await ScoreSaberLeaderboardScoresService.getLeaderboardScores(
            leaderboardId,
            page,
            country,
            realmId
          );
        }
      )
      .post(
        "/following/leaderboard/:leaderboardId/:page",
        {
          tags: ["Scores"],
          params: LeaderboardPageParamsSchema,
          query: RealmQuerySchema,
          body: FollowingLeaderboardScoresBodySchema,
          response: ScoreSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch followed players' scores for a leaderboard",
          },
        },
        async ({
          params: { leaderboardId, page },
          body: { followingIds },
          query: { realmId = DEFAULT_REALM_ID },
        }) => {
          return await PlayerFollowingScoresService.getFollowingLeaderboardScores(
            followingIds,
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
          params: TopScoresParamsSchema,
          query: TopScoresQuerySchema,
          response: TopScoresPageResponseSchema,
          detail: {
            description: "Fetch top scores",
          },
        },
        async ({ params: { page }, query: { limit, realmId = DEFAULT_REALM_ID } }) => {
          return await TopScoresService.getTopScores(page, limit, realmId);
        }
      )
  );
}
