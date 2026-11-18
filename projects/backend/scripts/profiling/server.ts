import "./env";
import { monitorEventLoopDelay } from "node:perf_hooks";
import MetricsService from "../../src/service/infra/metrics.service";
import { createTestApp } from "../../test/helpers/create-test-app";

const PORT = Number(process.env.PROFILE_SERVER_PORT ?? 8080);

new MetricsService();
const app = createTestApp();
app.listen(PORT);

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();
setInterval(() => {
  console.log(
    `[loop] p50=${(histogram.percentile(50) / 1e6).toFixed(1)}ms p99=${(histogram.percentile(99) / 1e6).toFixed(1)}ms max=${(histogram.max / 1e6).toFixed(1)}ms`
  );
  histogram.reset();
}, 5000);
console.log(`profile server on :${PORT}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => process.exit(0));
}
