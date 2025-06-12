import { connectBeatSaverWebsocket } from "@ssr/common/websocket/beatsaver-websocket";
import BeatSaverWebsocketMetric from "../metrics/impl/beatsaver/beatsaver-websocket-metrics";
import BeatSaverService from "../service/beatsaver.service";
import MetricsService, { MetricType } from "../service/metrics.service";

export class BeatSaverWebsocket {
  constructor() {
    connectBeatSaverWebsocket({
      onMapUpdate: async map => {
        const latestHash = map.versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].hash;
        await BeatSaverService.createOrUpdateMap(latestHash, map);

        (
          (await MetricsService.getMetric(
            MetricType.BEATSAVER_WEBSOCKET_MAP_UPDATES
          )) as BeatSaverWebsocketMetric
        ).incrementMapUpdates();
      },
    });
  }
}
