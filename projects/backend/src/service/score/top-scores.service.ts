import { Pagination } from "@ssr/common/pagination";
import type { TopScoresPageResponse } from "@ssr/common/schemas/response/score/top-scores";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import BeatSaverService from "../external/beatsaver.service";
import { ScoreCoreService } from "./score-core.service";

export class TopScoresService {
  /**
   * Gets the top tracked scores.
   *
   * @param page the page number
   * @returns the top scores with pagination metadata
   */
  public static async getTopScores(page: number = 1, limit: number = 25): Promise<TopScoresPageResponse> {
    const pagination = new Pagination<PlayerScore<ScoreSaberScore>>()
      .setItemsPerPage(limit)
      .setTotalItems(Math.min(50_000, await ScoreSaberScoresRepository.countTotal())); // allow up to 50,000 scores to be displayed

    return pagination.getPage(page, async fetchItems => {
      const scoresRows = await ScoreSaberScoresRepository.getTopScores(
        fetchItems.end - fetchItems.start,
        fetchItems.start
      );

      if (!scoresRows.length) {
        return [];
      }

      const leaderboards = await ScoreSaberLeaderboardsRepository.getLeaderboardsByIds(
        scoresRows.map(scoreRow => scoreRow.leaderboardId),
        false
      );
      const leaderboardMap = new Map(leaderboards.map(leaderboard => [leaderboard.id, leaderboard]));

      const scores = await Promise.all(
        scoresRows.map(async scoreRow => {
          const leaderboard = leaderboardMap.get(scoreRow.leaderboardId);
          if (!leaderboard) return undefined;

          const score = scoreSaberScoreRowToType(scoreRow);

          const [enrichedScore, beatSaver] = await Promise.all([
            ScoreCoreService.insertScoreData(score, leaderboard, {
              insertPlayerInfo: true,
              insertBeatLeaderScore: true,
              insertPreviousScore: false,
            }),
            BeatSaverService.getMap(
              leaderboard.songHash,
              leaderboard.difficulty.difficulty,
              leaderboard.difficulty.characteristic
            ),
          ]);

          return { score: enrichedScore, leaderboard, beatSaver };
        })
      );

      return scores.filter(Boolean) as PlayerScore<ScoreSaberScore>[];
    });
  }

  /**
   * Checks if a score is in the top 50 global scores.
   *
   * @param score the score to check
   * @returns whether the score is in the top 50 global scores
   */
  public static async isTop50GlobalScore(score: ScoreSaberScore): Promise<boolean> {
    if (score.pp <= 0 || score.rank >= 10) {
      return false;
    }

    const top50 = await ScoreSaberScoresRepository.selectTopPp();

    if (!top50.length) {
      return false;
    }

    const lowestPp = top50[top50.length - 1].pp;
    return score.pp >= lowestPp;
  }
}
