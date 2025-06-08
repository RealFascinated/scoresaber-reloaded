import { PlayerModel } from "@ssr/common/model/player";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerRefreshService } from "../../service/player/player-refresh.service";
import { Queue } from "../queue";
import { QueueName } from "../queue-manager";

export class PlayerScoreSeedQueue extends Queue<string> {
  constructor() {
    super(QueueName.PlayerScoreSeed, 10_000);

    (async () => {
      const players = await PlayerModel.find({ seededScores: null }).select("_id");
      for (const player of players) {
        this.add(player._id);
      }
    })();
  }

  protected async processItem(playerId: string): Promise<void> {
    const player = await PlayerCoreService.getPlayer(playerId, true);
    await PlayerRefreshService.refreshAllPlayerScores(player);
  }
}
