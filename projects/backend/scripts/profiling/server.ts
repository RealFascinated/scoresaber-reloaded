import "./env";
import { monitorEventLoopDelay } from "node:perf_hooks";
import RealmController from "../../src/controller/realm/realm.controller";
import SuggestedMapsController from "../../src/controller/suggested-maps/suggested-maps.controller";
import MetricsService from "../../src/service/infra/metrics.service";
import StorageService from "../../src/service/infra/storage.service";
import { PlayerCacheLivenessService } from "../../src/service/player/player-cache-liveness.service";
import { SuggestedMapsService } from "../../src/service/suggested-maps/suggested-maps.service";
import { createTestApp } from "../../test/helpers/create-test-app";

const PORT = Number(process.env.PROFILE_SERVER_PORT ?? 8080);

new MetricsService();
new StorageService();
await PlayerCacheLivenessService.start();
if (process.env.SKIP_SUGGESTED_MAPS_REFRESH !== "true") {
  await SuggestedMapsService.refresh();
}

const app = createTestApp().use(RealmController).use(SuggestedMapsController);
app.listen({ port: PORT, idleTimeout: 120 });

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();
setInterval(() => {
  console.log(
    `[loop] p50=${(histogram.percentile(50) / 1e6).toFixed(1)}ms p99=${(histogram.percentile(99) / 1e6).toFixed(1)}ms max=${(histogram.max / 1e6).toFixed(1)}ms rss=${(process.memoryUsage.rss() / 1e6).toFixed(0)}MB`
  );
  histogram.reset();
}, 5000);
console.log(`profile server on :${PORT}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => process.exit(0));
}
