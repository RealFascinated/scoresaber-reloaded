import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { CooldownPriority } from "@ssr/common/cooldown";
import Logger from "@ssr/common/logger";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerService } from "../../service/player/player.service";
import { Queue } from "../queue";
import { QueueId } from "../queue-manager";

export class LeaderboardPlayerSeedQueue extends Queue<number> {
  constructor() {
    super(QueueId.LeaderboardPlayerSeedQueue, false);

    // Load leaderboards efficiently using addAll
    setImmediate(async () => {
      try {
        const leaderboards = await ScoreSaberLeaderboardModel.find({
          seededPlayers: null,
          ranked: true,
        })
          .sort({
            plays: -1, // Highest plays first
          })
          .select("_id")
          .lean();
        const leaderboardIds = leaderboards.map(lb => lb._id);
        this.addAll(leaderboardIds);

        Logger.info(`Added ${leaderboardIds.length} leaderboards to seed queue`);
      } catch (error) {
        Logger.error("Failed to load unseeded leaderboards:", error);
      }
    });
  }

  protected async processItem(leaderboardId: number): Promise<void> {
    const leaderboard = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboard(leaderboardId, { priority: CooldownPriority.BACKGROUND });
    if (!leaderboard) {
      Logger.warn(`Leaderboard "${leaderboardId}" not found`);
      return;
    }

    const firstPage = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupLeaderboardScores(leaderboardId, 1, { priority: CooldownPriority.BACKGROUND });
    if (!firstPage) {
      Logger.warn(`Leaderboard "${leaderboardId}" first page not found`);
      return;
    }

    const players = firstPage.scores.map(score => score.leaderboardPlayerInfo.id);
    await this.trackPlayers(players);

    const pages = Math.ceil(firstPage.metadata.total / firstPage.metadata.itemsPerPage);
    for (let i = 2; i <= pages; i++) {
      Logger.info(`Fetching leaderboard "${leaderboardId}" page "${i}"...`);

      const page = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboardScores(leaderboardId, i, { priority: CooldownPriority.BACKGROUND });
      if (!page) {
        Logger.warn(`Leaderboard "${leaderboardId}" page "${i}" not found`);
        continue;
      }

      const players = page.scores.map(score => score.leaderboardPlayerInfo.id);
      await this.trackPlayers(players);

      Logger.info(
        `Leaderboard "${leaderboardId}" page "${i}" fetched. Tracking ${players.length} players...`
      );
    }

    // Update the leaderboard
    await ScoreSaberLeaderboardModel.updateOne(
      { _id: leaderboardId },
      { $set: { seededPlayers: true } }
    );
  }

  private async trackPlayers(players: string[]): Promise<void> {
    for (const player of players) {
      await PlayerService.trackPlayer(player);
    }
  }
}
