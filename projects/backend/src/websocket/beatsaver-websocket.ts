import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import BeatSaverService from "../service/beatsaver.service";
import CacheService from "../service/cache.service";

export class BeatSaverWebsocket {
  constructor() {
    connectBeatSaverWebsocket({
      onMapUpdate: async map => {
        const latestHash = map.versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].hash;
        await BeatSaverService.createOrUpdateMap(latestHash, map);
        await CacheService.invalidate(`beatsaver:${latestHash}`); // Invalidate the cache for the map
      },
    });
  }
}
