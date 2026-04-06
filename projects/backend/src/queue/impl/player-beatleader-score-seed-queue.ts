import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { PlayerBeatLeaderScoresService } from "../../service/player/player-beatleader-scores.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerBeatLeaderScoreSeedQueue extends Queue<QueueItem<string>> {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player BeatLeader Score Seed Queue");

  constructor() {
    super(QueueId.PlayerBeatLeaderScoreSeedQueue, "fifo");

    setImmediate(() => this.insertPlayers());
    setInterval(() => this.insertPlayers(), TimeUnit.toMillis(TimeUnit.Second, 10));
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    const playerId = item.id;

    const account = await PlayerCoreService.getAccount(playerId);
    if (!account) {
      PlayerBeatLeaderScoreSeedQueue.logger.warn(`Player "${playerId}" not found for BeatLeader score seed`);
      return;
    }

    await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, {
      mode: "backfill",
    });
  }

  private async insertPlayers() {
    if ((await this.getSize()) !== 0) {
      return;
    }
    try {
      const players = await ScoreSaberAccountsRepository.selectIdsNeedingBeatLeaderSeed();
      const playerIds = players.map(p => p.id);
      if (playerIds.length === 0) {
        PlayerBeatLeaderScoreSeedQueue.logger.info("No players to seed BeatLeader scores for");
        return;
      }

      for (const id of playerIds) {
        await this.add({ id, data: id });
      }

      await this.processQueue();
      PlayerBeatLeaderScoreSeedQueue.logger.info(
        `Added ${playerIds.length} players to BeatLeader score seed queue`
      );
    } catch (error) {
      PlayerBeatLeaderScoreSeedQueue.logger.error("Failed to load players for BeatLeader score seed:", error);
    }
  }
}
