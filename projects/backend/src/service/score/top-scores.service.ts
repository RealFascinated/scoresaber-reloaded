import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
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
  public static async getTopScores(page: number = 1): Promise<Page<PlayerScore<ScoreSaberScore>>> {
    const limit = 25;
    const offset = (page - 1) * limit;

    const pagination = new Pagination<PlayerScore<ScoreSaberScore>>()
      .setItemsPerPage(limit)
      .setTotalItems(1000);

    return pagination.getPage(page, async () => {
      const scoresRows = await ScoreSaberScoresRepository.getTopScores(limit, offset);

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
