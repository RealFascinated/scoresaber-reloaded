import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player/player";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { PlayerBeatLeaderScoresService } from "../../service/player/player-beatleader-scores.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerBeatLeaderScoreSeedQueue extends Queue<QueueItem<string>> {
  constructor() {
    super(QueueId.PlayerBeatLeaderScoreSeedQueue, "lifo");

    setImmediate(() => this.insertPlayers());
    setInterval(() => this.insertPlayers(), TimeUnit.toMillis(TimeUnit.Minute, 5));
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    const playerId = item.id;

    const player = await PlayerModel.findOne({ _id: playerId }).lean();
    if (!player) {
      Logger.warn(`Player "${playerId}" not found for BeatLeader score seed`);
      return;
    }

    await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(player, { mode: "backfill" });
  }

  private async insertPlayers() {
    if ((await this.getSize()) !== 0) {
      return;
    }
    try {
      const players = await PlayerModel.find({
        seededBeatLeaderScores: { $in: [null, false] },
        banned: false,
      })
        .select("_id")
        .limit(100)
        .lean();
      const playerIds = players.map(p => p._id);
      if (playerIds.length === 0) {
        Logger.info("No players to seed BeatLeader scores for");
        return;
      }

      for (const id of playerIds) {
        await this.add({ id, data: id });
      }

      await this.processQueue();
      Logger.info(`Added ${playerIds.length} players to BeatLeader score seed queue`);
    } catch (error) {
      Logger.error("Failed to load players for BeatLeader score seed:", error);
    }
  }
}
