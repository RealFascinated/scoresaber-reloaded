import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import BeatSaverService from "../service/beatsaver.service";

export class BeatSaverWebsocket {
  constructor() {
    connectBeatSaverWebsocket({
      onMapUpdate: async map => {
        const latestHash = map.versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].hash;
        await BeatSaverService.createOrUpdateMap(latestHash, map);
      },
    });
  }
}
