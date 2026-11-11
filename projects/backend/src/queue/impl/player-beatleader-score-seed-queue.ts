import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { PlayerBeatLeaderScoresService } from "../../service/player/player-beatleader-scores.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerBeatLeaderScoreSeedQueue extends Queue<QueueItem<string>> {
  /** Players enqueued per cycle; the rest are picked up by later cycles once the queue drains. */
  private static readonly SEED_CYCLE_LIMIT = 20_000;

  private static readonly logger: ScopedLogger = Logger.withTopic("Player BeatLeader Score Seed Queue");

  constructor() {
    super(QueueId.PlayerBeatLeaderScoreSeedQueue, "fifo", 4);

    setImmediate(() => this.insertPlayers());
    setInterval(() => this.insertPlayers(), TimeUnit.toMillis(TimeUnit.Minute, 10));
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    const playerId = item.id;

    const account = await PlayerCoreService.getAccount(playerId);
    if (!account) {
      PlayerBeatLeaderScoreSeedQueue.logger.warn(`Player "${playerId}" not found for BeatLeader score seed`);
      return;
    }

    // A seeded player's scores are tracked in real time; walking the whole history again only costs API calls
    if (account.seededBeatLeaderScores) {
      return;
    }

    await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(account, {
      mode: "backfill",
    });
  }

  private async insertPlayers() {
    if ((await this.getSize()) !== 0 || this.getActiveWorkers() > 0) {
      return;
    }
    try {
      const players = await ScoreSaberAccountsRepository.selectIdsNeedingBeatLeaderSeed(
        PlayerBeatLeaderScoreSeedQueue.SEED_CYCLE_LIMIT
      );
      if (players.length === 0) {
        PlayerBeatLeaderScoreSeedQueue.logger.info("No players to seed BeatLeader scores for");
        return;
      }

      await this.addAll(players.map(player => ({ id: player.id, data: player.id })));

      await this.processQueue();
      PlayerBeatLeaderScoreSeedQueue.logger.info(
        `Added ${players.length} players to BeatLeader score seed queue`
      );
    } catch (error) {
      PlayerBeatLeaderScoreSeedQueue.logger.error("Failed to load players for BeatLeader score seed:", error);
    }
  }
}
