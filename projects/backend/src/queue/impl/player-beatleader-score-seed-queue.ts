import Logger from "@ssr/common/logger";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountRowToPlayer } from "../../db/converter/scoresaber-account";
import { scoreSaberAccountsTable } from "../../db/schema";
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

    const [row] = await db
      .select()
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId))
      .limit(1);
    if (!row) {
      Logger.warn(`Player "${playerId}" not found for BeatLeader score seed`);
      return;
    }

    await PlayerBeatLeaderScoresService.fetchMissingBeatLeaderScores(scoreSaberAccountRowToPlayer(row), {
      mode: "backfill",
    });
  }

  private async insertPlayers() {
    if ((await this.getSize()) !== 0) {
      return;
    }
    try {
      const players = await db
        .select({ id: scoreSaberAccountsTable.id })
        .from(scoreSaberAccountsTable)
        .where(and(eq(scoreSaberAccountsTable.seededBeatLeaderScores, false), eq(scoreSaberAccountsTable.banned, false)))
        .limit(100);
      const playerIds = players.map(p => p.id);
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
