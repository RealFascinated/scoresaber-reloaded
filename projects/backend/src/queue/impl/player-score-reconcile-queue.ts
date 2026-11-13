import { PlayerScoresService } from "../../service/player/player-scores.service";
import { Queue, QueueItem } from "../queue";
import { QueueId } from "../queue-manager";

/**
 * Reconciles a player's stored scores with ScoreSaber (adds missing scores, deletes scores ScoreSaber
 * no longer has) after a score count mismatch was spotted. Items are de-duplicated by player id.
 */
export class PlayerScoreReconcileQueue extends Queue<QueueItem<string>> {
  constructor() {
    super(QueueId.PlayerScoreReconcileQueue, "fifo", 1);
  }

  protected async processItem(item: QueueItem<string>): Promise<void> {
    await PlayerScoresService.reconcilePlayerScores(item.id);
  }
}
