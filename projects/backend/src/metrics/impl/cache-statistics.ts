import Metric from "../metric";
import { Point } from "@influxdata/influxdb-client";
import CacheService from "../../service/cache.service";

export default class CacheStatisticsMetric extends Metric {
  constructor() {
    super("cache-statistics");
  }

  async collect(): Promise<Point | Point[]> {
    const points: Point[] = [];
    const cacheStatistics = CacheService.getCacheStatistics();

    for (const [cacheName, statistics] of Object.entries(cacheStatistics)) {
      const point = new Point(this.id);
      point.tag("cache", cacheName);
      point.intField("size", statistics.size);
      point.intField("keys", statistics.keys);
      point.intField("hits", statistics.hits);
      point.intField("misses", statistics.misses);
      point.intField("expired", statistics.expired);
      point.intField("hitPercentage", statistics.hitPercentage);

      points.push(point);
    }

    return points;
  }
}
