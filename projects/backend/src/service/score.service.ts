import { Metadata } from "@ssr/common/types/metadata";
import { NotFoundError } from "elysia";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { Leaderboards } from "@ssr/common/leaderboard";
import LeaderboardService from "./leaderboard.service";
import { PlayerScore } from "@ssr/common/score/player-score";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { fetchWithCache } from "../common/cache.util";
import { ScoreType } from "@ssr/common/model/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Leaderboard from "@ssr/common/model/leaderboard/leaderboard";
import CacheService, { ServiceCache } from "./cache.service";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import BeatLeaderService from "./beatleader.service";
import ScoreSaberService from "./scoresaber.service";

export class ScoreService {
  public static async lookupPlayerScores(
    leaderboardName: Leaderboards,
    playerId: string,
    page: number,
    sort: string,
    search?: string
  ): Promise<PlayerScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.PlayerScores),
      `player-scores:${leaderboardName}-${playerId}-${page}-${sort}-${search}`,
      async () => {
        const scores: PlayerScore<unknown, unknown>[] = [];
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardScores = await scoresaberService.lookupPlayerScores({
              playerId,
              page,
              sort: sort as ScoreSort,
              search,
            });
            if (leaderboardScores == undefined) {
              break;
            }

            metadata = new Metadata(
              Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
              leaderboardScores.metadata.total,
              leaderboardScores.metadata.page,
              leaderboardScores.metadata.itemsPerPage
            );

            const scorePromises = leaderboardScores.playerScores.map(async token => {
              const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
                "scoresaber",
                token.leaderboard.id + ""
              );

              if (!leaderboardResponse) {
                return undefined;
              }
              const { leaderboard, beatsaver } = leaderboardResponse;
              const score = getScoreSaberScoreFromToken(token.score, leaderboard, playerId);
              if (!score) {
                return undefined;
              }

              // Fetch additional data, previous score, and BeatSaver map concurrently
              const [additionalData, previousScore] = await Promise.all([
                BeatLeaderService.getAdditionalScoreData(
                  playerId,
                  leaderboard.songHash,
                  `${leaderboard.difficulty.difficulty}-${leaderboard.difficulty.characteristic}`,
                  score.score
                ),
                ScoreSaberService.getPreviousScore(playerId, leaderboard, score.timestamp),
              ]);

              if (additionalData) {
                score.additionalData = additionalData.toObject();
              }
              if (previousScore) {
                score.previousScore = previousScore;
              }

              return {
                score: score,
                leaderboard: leaderboard,
                beatSaver: beatsaver,
              } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
            });

            const resolvedScores = (await Promise.all(scorePromises)).filter(s => s !== undefined);
            scores.push(...resolvedScores);
            break;
          }
          default: {
            throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
          }
        }

        return {
          scores: scores,
          metadata: metadata,
        };
      }
    );
  }

  /**
   * Gets scores for a leaderboard.
   *
   * @param leaderboardName the leaderboard to get the scores from
   * @param leaderboardId the leaderboard id
   * @param page the page to get
   * @param country the country to get scores in
   * @returns the scores
   */
  public static async getLeaderboardScores(
    leaderboardName: Leaderboards,
    leaderboardId: string,
    page: number,
    country?: string
  ): Promise<LeaderboardScoresResponse<unknown, unknown> | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.LeaderboardScores),
      `leaderboard-scores:${leaderboardName}-${leaderboardId}-${page}-${country}`,
      async () => {
        const scores: ScoreType[] = [];
        let leaderboard: Leaderboard | undefined;
        let beatSaverMap: BeatSaverMapResponse | undefined;
        let metadata: Metadata = new Metadata(0, 0, 0, 0); // Default values

        switch (leaderboardName) {
          case "scoresaber": {
            const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
              leaderboardName,
              leaderboardId
            );
            if (leaderboardResponse == undefined) {
              throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
            }
            leaderboard = leaderboardResponse.leaderboard;
            beatSaverMap = leaderboardResponse.beatsaver;

            const leaderboardScores = await scoresaberService.lookupLeaderboardScores(leaderboardId, page, country);
            if (leaderboardScores == undefined) {
              break;
            }

            for (const token of leaderboardScores.scores) {
              const score = getScoreSaberScoreFromToken(
                token,
                leaderboardResponse.leaderboard,
                token.leaderboardPlayerInfo.id
              );
              if (score == undefined) {
                continue;
              }
              scores.push(score);
            }

            metadata = new Metadata(
              Math.ceil(leaderboardScores.metadata.total / leaderboardScores.metadata.itemsPerPage),
              leaderboardScores.metadata.total,
              leaderboardScores.metadata.page,
              leaderboardScores.metadata.itemsPerPage
            );
            break;
          }
          default: {
            throw new NotFoundError(`Leaderboard "${leaderboardName}" not found`);
          }
        }

        return {
          scores: scores,
          leaderboard: leaderboard,
          beatSaver: beatSaverMap,
          metadata: metadata,
        };
      }
    );
  }
}
