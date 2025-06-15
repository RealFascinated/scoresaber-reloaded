import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { PlayerModel } from "@ssr/common/model/player";
import { PlayerRefreshService } from "../../service/player/player-refresh.service";
import { PlayerService } from "../../service/player/player.service";
import { Queue } from "../queue";
import { QueueId } from "../queue-manager";

export class PlayerScoreSeedQueue extends Queue<string> {
  constructor() {
    super(QueueId.PlayerScoreSeed);

    (async () => {
      const players = await PlayerModel.find({ seededScores: null }).select("_id");
      for (const player of players) {
        this.add(player._id);
      }
    })();
  }

  protected async processItem(playerId: string): Promise<void> {
    const playerToken = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayer(playerId);

    if (!playerToken) {
      Logger.warn(`Player "${playerId}" not found on ScoreSaber`);
      return;
    }

    const player = await PlayerService.getPlayer(playerId, true, playerToken);
    await PlayerRefreshService.refreshAllPlayerScores(player, playerToken);
  }
}
