import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { qualifiedLeaderboardsCacheKey, rankedLeaderboardsCacheKey } from "../../common/cache-keys";
import { ScoreSaberScoreHistoryRow } from "../../db/schema";
import { ScoreSaberLeaderboardStarChangeRepository } from "../../repositories/scoresaber-leaderboard-star-change.repository";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoreHistoryRepository } from "../../repositories/scoresaber-score-history.repository";
import {
  type ScoreSaberScoreUpsertRow,
  ScoreSaberScoresRepository,
} from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService from "../infra/cache.service";
import { ScoreSaberMedalScoresService } from "../score/scoresaber-medal-scores.service";
import { ScoreSaberLeaderboardsService } from "./scoresaber-leaderboards.service";

export type LeaderboardUpdate = {
  previousLeaderboard?: Pick<ScoreSaberLeaderboard, "ranked" | "qualified" | "stars">;
  newLeaderboard: ScoreSaberLeaderboard;
};

export class LeaderboardRankedSyncService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Ranked Leaderboard Sync");

  /**
   * Refreshes the ranked leaderboards.
   *
   * @returns leaderboards whose ranked/qualified/stars status changed.
   */
  public static async refreshRankedLeaderboards(): Promise<LeaderboardUpdate[]> {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing ranked leaderboards...`);
    const { leaderboards } = await ScoreSaberLeaderboardsService.fetchLeaderboardsFromAPI("ranked", true);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} ranked leaderboards.`);

    const dbRankedRows = await ScoreSaberLeaderboardsRepository.getRankedSnapshots();
    const rankedLeaderboards = new Map(dbRankedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert: ScoreSaberLeaderboard[] = [];
    const updatedLeaderboards: LeaderboardUpdate[] = [];

    let checked = 0;
    for (const apiLeaderboard of leaderboards) {
      checked++;
      if (checked % 500 === 0 || checked === 1 || checked === leaderboards.length) {
        LeaderboardRankedSyncService.logger.info(
          `Checked ${checked} of ${leaderboards.length} leaderboards.`
        );
      }

      const dbLeaderboard = rankedLeaderboards.get(apiLeaderboard.id);
      const statusChanged =
        dbLeaderboard?.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard?.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard?.stars !== apiLeaderboard.stars;

      if (!dbLeaderboard || statusChanged) {
        leaderboardsToUpsert.push(apiLeaderboard);
      }

      if (statusChanged) {
        updatedLeaderboards.push({
          previousLeaderboard: dbLeaderboard
            ? {
                ranked: dbLeaderboard.ranked,
                qualified: dbLeaderboard.qualified,
                stars: dbLeaderboard.stars ?? 0,
              }
            : undefined,
          newLeaderboard: apiLeaderboard,
        });

        // Stars count has changed
        if (dbLeaderboard && dbLeaderboard.stars !== apiLeaderboard.stars) {
          await LeaderboardRankedSyncService.reweightHistoryScores(apiLeaderboard);
          await ScoreSaberLeaderboardStarChangeRepository.insertRow({
            leaderboardId: apiLeaderboard.id,
            previousStars: dbLeaderboard.stars ?? 0,
            newStars: apiLeaderboard.stars,
            timestamp: new Date(),
          });
        }

        // Leaderboard has been ranked
        if (!dbLeaderboard?.ranked && apiLeaderboard.ranked) {
          await ScoreSaberMedalScoresService.rescanLeaderboard(apiLeaderboard.id, true);
          await LeaderboardRankedSyncService.updateLeaderboardScores(apiLeaderboard);
        }
      }
    }

    // There has been ranked leaderboard changes
    if (leaderboardsToUpsert.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Updating ${leaderboardsToUpsert.length} leaderboards...`);

      for (const batch of chunkArray(leaderboardsToUpsert, 250)) {
        await ScoreSaberLeaderboardsRepository.upsertLeaderboards(batch);
        LeaderboardRankedSyncService.logger.info(`Updated batch of ${batch.length} leaderboards!`);
      }

      await CacheService.invalidate(rankedLeaderboardsCacheKey);

      const duration = formatDuration(performance.now() - before);
      LeaderboardRankedSyncService.logger.info(
        `Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`
      );
      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Ranked Leaderboards Updated")
          .setDescription(`Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`)
          .setColor("#00ff00")
      );
    }

    return updatedLeaderboards;
  }

  /**
   * Refreshes the qualified leaderboards.
   */
  public static async refreshQualifiedLeaderboards() {
    const before = performance.now();

    LeaderboardRankedSyncService.logger.info(`Refreshing qualified leaderboards...`);
    const { leaderboards } = await ScoreSaberLeaderboardsService.fetchLeaderboardsFromAPI("qualified", true);
    LeaderboardRankedSyncService.logger.info(`Found ${leaderboards.length} qualified leaderboards.`);

    const dbQualifiedRows = await ScoreSaberLeaderboardsRepository.getQualifiedSnapshots();
    const dbById = new Map(dbQualifiedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert = leaderboards.filter(apiLeaderboard => {
      const db = dbById.get(apiLeaderboard.id);
      return (
        !db ||
        db.ranked !== apiLeaderboard.ranked ||
        db.qualified !== apiLeaderboard.qualified ||
        db.stars !== apiLeaderboard.stars
      );
    });

    if (leaderboardsToUpsert.length > 0) {
      LeaderboardRankedSyncService.logger.info(`Updating ${leaderboardsToUpsert.length} leaderboards...`);
      await ScoreSaberLeaderboardsRepository.upsertLeaderboards(leaderboardsToUpsert);
      await CacheService.invalidate(qualifiedLeaderboardsCacheKey);

      const duration = formatDuration(performance.now() - before);
      LeaderboardRankedSyncService.logger.info(
        `Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`
      );
      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Qualified Leaderboards Updated")
          .setDescription(`Updated ${leaderboardsToUpsert.length} leaderboards in ${duration}`)
          .setColor("#00ff00")
      );
    }
  }

  /**
   * Reweights the history scores for a leaderboard.
   *
   * @param leaderboard the leaderboard to reweight
   */
  private static async reweightHistoryScores(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    LeaderboardRankedSyncService.logger.info(
      `Reweighting history scores for leaderboard "${leaderboard.id}"...`
    );

    const rows = await ScoreSaberScoreHistoryRepository.getPpAccuracyByLeaderboardId(leaderboard.id);
    const updates: Partial<ScoreSaberScoreHistoryRow>[] = [];

    for (const row of rows) {
      const newPp = ScoreSaberCurve.getPp(leaderboard.stars, row.accuracy);
      if (row.pp !== newPp) {
        updates.push({ id: row.id, pp: newPp });
      }
    }

    if (updates.length > 0) {
      await ScoreSaberScoreHistoryRepository.bulkUpsetHistoryScores(
        updates.map(u => ({ id: u.id, pp: u.pp }))
      );
      LeaderboardRankedSyncService.logger.info(
        `Reweighted ${updates.length} of ${rows.length} history scores for leaderboard "${leaderboard.id}".`
      );
    }
  }

  /**
   * Updates the scores for a leaderboard.
   *
   * @param leaderboard the leaderboard to update
   */
  private static async updateLeaderboardScores(leaderboard: ScoreSaberLeaderboard): Promise<void> {
    LeaderboardRankedSyncService.logger.info(`Updating scores for leaderboard "${leaderboard.id}"...`);

    const scoreOps: ScoreSaberScore[] = [];
    let page = 1;

    while (true) {
      const response = await ScoreSaberApiService.lookupLeaderboardScores(leaderboard.id, page);
      if (!response) break;

      for (const token of response.scores) {
        scoreOps.push(getScoreSaberScoreFromToken(token, leaderboard, token.leaderboardPlayerInfo.id));
      }

      const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
      if (page >= totalPages) break;
      page++;
    }

    if (scoreOps.length === 0) {
      return;
    }

    const existingRows = await ScoreSaberScoresRepository.selectSnapshotsByLeaderboardAndScoreIds(
      leaderboard.id,
      scoreOps.map(s => s.scoreId)
    );
    const existingMap = new Map(existingRows.map(r => [r.scoreId, { score: r.score, pp: r.pp }]));

    const hasChanged = (s: ScoreSaberScore) => {
      const ex = existingMap.get(s.scoreId);
      return !ex || ex.score !== s.score || ex.pp !== s.pp;
    };
    const toWrite = scoreOps.filter(hasChanged);

    if (toWrite.length === 0) {
      LeaderboardRankedSyncService.logger.info(
        `No score changes needed for leaderboard "${leaderboard.id}" (${scoreOps.length} scores checked).`
      );
      return;
    }

    let upserted = 0;
    for (const batch of chunkArray(toWrite, 100)) {
      const rows: ScoreSaberScoreUpsertRow[] = batch.map(score => {
        const modifiers = score.modifiers.map(m => m.toString());
        return {
          scoreId: score.scoreId,
          playerId: score.playerId,
          leaderboardId: score.leaderboardId,
          difficulty: score.difficulty,
          characteristic: score.characteristic,
          score: score.score,
          accuracy: score.accuracy,
          pp: score.pp,
          missedNotes: score.missedNotes,
          badCuts: score.badCuts,
          maxCombo: score.maxCombo,
          fullCombo: score.fullCombo,
          modifiers: modifiers.length > 0 ? modifiers : null,
          hmd: score.hmd,
          rightController: score.rightController,
          leftController: score.leftController,
          timestamp: score.timestamp,
        };
      });
      await ScoreSaberScoresRepository.bulkUpsertScores(rows);
      upserted += batch.length;
    }

    LeaderboardRankedSyncService.logger.info(
      `Upserted ${upserted} of ${scoreOps.length} scores for leaderboard "${leaderboard.id}" (${scoreOps.length - toWrite.length} skipped).`
    );
  }
}
