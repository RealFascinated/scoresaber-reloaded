import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Timeframe } from "@ssr/common/timeframe";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { scoreToObject } from "../../common/score/score.util";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import ScoreSaberService from "../scoresaber.service";
import { ScoreService } from "./score.service";

export class TopScoresService {
  /**
   * Gets the top tracked scores.
   *
   * @param timeframe the timeframe to filter by
   * @param page the page number (1-based)
   * @returns the top scores with pagination metadata
   */
  public static async getTopScores(
    timeframe: Timeframe,
    page: number = 1
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    let daysAgo = -1;
    if (timeframe === "daily") {
      daysAgo = 1;
    } else if (timeframe === "weekly") {
      daysAgo = 8;
    } else if (timeframe === "monthly") {
      daysAgo = 31;
    }

    const pagination = new Pagination<
      PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>
    >().setItemsPerPage(25);

    // Build the match condition
    const matchCondition = {
      ...(timeframe === "all" ? {} : { timestamp: { $gte: getDaysAgoDate(daysAgo) } }),
      pp: { $gt: 0 },
    };

    // Use separate queries for better performance
    const [total, scores] = await Promise.all([
      // Get total count
      ScoreSaberScoreModel.countDocuments(matchCondition),
      // Get scores with pagination
      ScoreSaberScoreModel.aggregate([
        { $match: matchCondition },
        { $sort: { pp: -1 } },
        { $skip: (page - 1) * 25 },
        { $limit: 25 },
      ]).hint(timeframe === "all" ? { pp: -1 } : { timestamp: 1, pp: -1 }), // Use appropriate index based on filtering
    ]);

    pagination.setTotalItems(total);

    return pagination.getPage(page, async () => {
      const scoreObjects = scores.map(scoreToObject);

      // Batch fetch leaderboards using getLeaderboards
      const leaderboardIds = scoreObjects.map((score: ScoreSaberScore) =>
        score.leaderboardId.toString()
      );
      const leaderboardResponses = await LeaderboardService.getLeaderboards(leaderboardIds, {
        includeBeatSaver: true,
        cacheOnly: true,
      });

      // Batch fetch player info
      const uniquePlayerIds = [
        ...new Set(scoreObjects.map((score: ScoreSaberScore) => score.playerId.toString())),
      ] as string[];
      const playerPromises = uniquePlayerIds.map(playerId =>
        ScoreSaberService.getCachedPlayer(playerId, true).catch(() => undefined)
      );
      const players = await Promise.all(playerPromises);
      const playerMap = new Map(
        players.filter((p): p is NonNullable<typeof p> => p !== undefined).map(p => [p.id, p])
      );

      // Create a map for quick leaderboard lookup
      const leaderboardMap = new Map(
        leaderboardResponses.map(response => [response.leaderboard.id, response])
      );

      // Process scores in parallel
      const processedScores = await Promise.all(
        scoreObjects.map(async (score: ScoreSaberScore) => {
          const leaderboardResponse = leaderboardMap.get(score.leaderboardId);
          if (!leaderboardResponse) {
            return null;
          }

          const { leaderboard, beatsaver } = leaderboardResponse;
          const player = playerMap.get(score.playerId.toString());

          // Skip scores from banned players
          if (player?.banned) {
            return null;
          }

          if (player) {
            score.playerInfo = {
              id: player.id,
              name: player.name,
            };
          } else {
            score.playerInfo = {
              id: score.playerId.toString(),
            };
          }

          const processedScore = await ScoreService.insertScoreData(score, leaderboard, undefined, {
            removeScoreWeight: true,
          });
          return {
            score: processedScore,
            leaderboard: leaderboard,
            beatSaver: beatsaver,
          } as PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>;
        })
      );

      // Filter out any null entries that might result from skipped scores
      return processedScores.filter(
        (score): score is PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard> => score !== null
      );
    });
  }

  /**
   * Checks if a score is in the top 50 global scores.
   *
   * @param score the score to check
   * @returns whether the score is in the top 50 global scores
   */
  public static async isTop50GlobalScore(score: ScoreSaberScore | ScoreSaberScoreToken) {
    // Only check top 50 if score is in top 10 and has positive PP
    if (score.pp <= 0 || score.rank >= 10) {
      return false;
    }

    const { items: top50Scores } = await ScoreService.getTopScores("all", 1);
    const lowestPp = top50Scores.reduce((min, score) => Math.min(min, score.score.pp), Infinity);
    return score.pp >= lowestPp;
  }
}
