import { NotFoundError } from "@ssr/common/error/not-found-error";
import { Page, Pagination } from "@ssr/common/pagination";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberScoresTable } from "../../db/schema";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

export class PlayerFriendScoresService {
  /**
   * Gets friend scores for a leaderboard.
   *
   * @param friendIds the friend ids
   * @param leaderboardId the leaderboard id
   * @param page the page to fetch
   */
  public static async getFriendLeaderboardScores(
    friendIds: string[],
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const limit = 8;
    const offset = (page - 1) * limit;
    const conditions = and(
      inArray(scoreSaberScoresTable.playerId, friendIds),
      eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
    );

    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoresTable)
      .where(conditions);

    if (total === 0) {
      throw new NotFoundError(
        `No scores found for friends "${friendIds.join(",")}" in leaderboard "${leaderboardId}"`
      );
    }

    const pagination = new Pagination<ScoreSaberScore>().setTotalItems(total).setItemsPerPage(limit);

    return pagination.getPage(page, async () => {
      const rawScores = await db
        .select()
        .from(scoreSaberScoresTable)
        .where(conditions)
        .orderBy(desc(scoreSaberScoresTable.score))
        .limit(limit)
        .offset(offset);

      if (!rawScores.length) {
        return [];
      }

      return Promise.all(
        rawScores.map(async rawScore => {
          const score = scoreSaberScoreRowToType(rawScore);
          return ScoreCoreService.insertScoreData(score, leaderboard, {
            insertBeatLeaderScore: true,
            insertPreviousScore: false,
            insertPlayerInfo: true,
          });
        })
      );
    });
  }
}
