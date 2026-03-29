import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { desc, eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "../../db/schema";
import BeatSaverService from "../beatsaver.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "./score-core.service";

export class TopScoresService {
  /**
   * Gets the top tracked scores.
   *
   * @param page the page number
   * @returns the top scores with pagination metadata
   */
  public static async getTopScores(page: number = 1): Promise<Page<PlayerScore>> {
    const limit = 25;
    const offset = (page - 1) * limit;

    const pagination = new Pagination<PlayerScore>().setItemsPerPage(limit).setTotalItems(1000);

    return pagination.getPage(page, async () => {
      const rawScores = await db
        .select()
        .from(scoreSaberScoresTable)
        .innerJoin(
          scoreSaberLeaderboardsTable,
          eq(scoreSaberScoresTable.leaderboardId, scoreSaberLeaderboardsTable.id)
        )
        .where(gt(scoreSaberScoresTable.pp, 0))
        .orderBy(desc(scoreSaberScoresTable.pp))
        .limit(limit)
        .offset(offset);

      if (!rawScores.length) {
        return [];
      }

      const leaderboardIds = [...new Set(rawScores.map(r => r["scoresaber-leaderboards"].id))];
      const leaderboardMap =
        await LeaderboardCoreService.getLeaderboardsWithDifficultiesByIds(leaderboardIds);

      return (
        await Promise.all(
          rawScores.map(
            async ({ "scoresaber-scores": rawScore, "scoresaber-leaderboards": rawLeaderboard }) => {
              const leaderboard = leaderboardMap.get(rawLeaderboard.id);
              if (!leaderboard) {
                return undefined;
              }
              const score = scoreSaberScoreRowToType(rawScore);

              return {
                score: await ScoreCoreService.insertScoreData(score, leaderboard, {
                  insertPlayerInfo: true,
                }),
                leaderboard,
                beatSaver: await BeatSaverService.getMap(
                  leaderboard.songHash,
                  leaderboard.difficulty.difficulty,
                  leaderboard.difficulty.characteristic,
                  "full"
                ),
              } as PlayerScore;
            }
          )
        )
      ).filter(Boolean) as PlayerScore[];
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

    const top50 = await db
      .select({ pp: scoreSaberScoresTable.pp })
      .from(scoreSaberScoresTable)
      .where(gt(scoreSaberScoresTable.pp, 0))
      .orderBy(desc(scoreSaberScoresTable.pp))
      .limit(50);

    if (!top50.length) {
      return false;
    }

    const lowestPp = top50[top50.length - 1].pp;
    return score.pp >= lowestPp;
  }
}
