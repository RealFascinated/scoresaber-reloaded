import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardScoresPageToken from "@ssr/common/types/token/scoresaber/leaderboard-scores-page";
import { LeaderboardService } from "../../service/leaderboard/leaderboard.service";
import { ScoreService } from "../../service/score/score.service";
import { Queue } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardScoreSeedQueue extends Queue<number> {
  constructor() {
    super(QueueId.LeaderboardScoreRefreshQueue, false, "fifo");

    setImmediate(async () => {
      try {
        const leaderboards = await ScoreSaberLeaderboardModel.find({
          seededScores: null,
          ranked: true,
        })
          .sort({ plays: 1 }) // Sort by plays ascending (least played)
          .select("_id")
          .lean();
        const leaderboardIds = leaderboards.map(leaderboard => leaderboard._id);
        this.addAll(leaderboardIds);

        Logger.debug(`Added ${leaderboardIds.length} leaderboards to score refresh queue`);
      } catch (error) {
        Logger.error("[LEADERBOARD SCORE SEED] Failed to load unseeded leaderboards:", error);
      }
    });
  }

  protected async processItem(leaderboardId: number): Promise<void> {
    const leaderboard = await ScoreSaberLeaderboardModel.findById(leaderboardId);
    if (!leaderboard) {
      Logger.warn(`[LEADERBOARD SCORE SEED] Leaderboard "${leaderboardId}" not found`);
      return;
    }

    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboardScores(leaderboardId, 1, {
        priority: CooldownPriority.BACKGROUND,
      });
    if (!firstPage) {
      Logger.warn(`[LEADERBOARD SCORE SEED] Leaderboard "${leaderboardId}" has no scores`);
      return;
    }

    const trackedScores = await ScoreSaberScoreModel.countDocuments({
      leaderboardId,
    });

    if (trackedScores >= firstPage.metadata.total) {
      Logger.info(
        `[LEADERBOARD SCORE SEED] Leaderboard "${leaderboardId}" has no new scores to seed. Skipping...`
      );
      await ScoreSaberLeaderboardModel.updateOne(
        { _id: leaderboardId },
        { $set: { seededScores: true } }
      );
      return;
    }

    // Seed the first page
    await this.seedLeaderboardScores(leaderboard, firstPage);

    // Calculate total pages
    const totalPages = Math.ceil(firstPage.metadata.total / firstPage.metadata.itemsPerPage);

    // Start from page 2 since we already processed page 1
    let currentPage = 2;

    while (currentPage <= totalPages) {
      Logger.info(
        `[LEADERBOARD SCORE SEED] Seeding page ${currentPage}/${totalPages} for leaderboard ${leaderboardId}`
      );
      const page = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId, currentPage, {
          priority: CooldownPriority.BACKGROUND,
        });

      // Invalid page
      if (!page) {
        Logger.warn(
          `Failed to fetch page ${currentPage}/${totalPages} for leaderboard ${leaderboardId}`
        );
        break;
      }

      // Seed the scores
      await this.seedLeaderboardScores(leaderboard, page);
      currentPage++;
    }

    // Update leaderboard scores rank
    if (leaderboard.ranked) {
      await LeaderboardService.refreshLeaderboardScoresRank(leaderboard);
    }

    // Update the leaderboard
    await ScoreSaberLeaderboardModel.updateOne(
      { _id: leaderboardId },
      { $set: { seededScores: true } }
    );

    Logger.info(
      `[LEADERBOARD SCORE SEED] Successfully seeded scores for leaderboard ${leaderboardId}`
    );
  }

  /**
   * Seeds the scores for a leaderboard.
   *
   * @param leaderboard the leaderboard object
   * @param token the token of the leaderboard scores
   */
  private async seedLeaderboardScores(
    leaderboard: ScoreSaberLeaderboard,
    token: ScoreSaberLeaderboardScoresPageToken
  ) {
    for (const scoreToken of token.scores) {
      try {
        const score = getScoreSaberScoreFromToken(scoreToken, leaderboard);
        // await PlayerService.trackPlayer(score.playerId);
        await ScoreService.trackScoreSaberScore(score, leaderboard, score.playerInfo);
      } catch (error) {
        Logger.error(
          `[LEADERBOARD SCORE SEED] Failed to seed score for player ${scoreToken.leaderboardPlayerInfo.id} in leaderboard ${leaderboard._id}:`,
          error
        );
        // Continue processing other scores even if one fails
      }
    }
  }
}
