import "./env";
import { heapStats } from "bun:jsc";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { SuggestedMapsService } from "../../src/service/suggested-maps/suggested-maps.service";

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();
const maxes: number[] = [];
const timer = setInterval(() => {
  maxes.push(histogram.max / 1e6);
  console.log(
    `[loop] p99=${(histogram.percentile(99) / 1e6).toFixed(1)}ms max=${(histogram.max / 1e6).toFixed(1)}ms rss=${(process.memoryUsage.rss() / 1e6).toFixed(0)}MB heap=${(process.memoryUsage().heapUsed / 1e6).toFixed(0)}MB`
  );
  histogram.reset();
}, 250);

let tick = 0;
const types = setInterval(() => {
  tick++;
  if (process.env.HEAP_TYPES === "1" && tick % 30 === 0) {
    Bun.gc(true);
    const counts = Object.entries(heapStats().objectTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => `${name}=${count}`)
      .join(" ");
    console.log(`[types] heapAfterGc=${(heapStats().heapSize / 1e6).toFixed(0)}MB ${counts}`);
  }
}, 250);
const before = performance.now();
await SuggestedMapsService.refresh();
clearInterval(timer);
clearInterval(types);
const sorted = [...maxes].sort((a, b) => a - b);
console.log(
  `[refit] took=${((performance.now() - before) / 1000).toFixed(1)}s worst=${sorted[sorted.length - 1]?.toFixed(0)}ms p90-of-seconds=${sorted[Math.floor(sorted.length * 0.9)]?.toFixed(0)}ms seconds>100ms=${maxes.filter(m => m > 100).length}/${maxes.length}`
);
process.exit(0);
