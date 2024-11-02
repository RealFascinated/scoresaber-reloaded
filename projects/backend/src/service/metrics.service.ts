import { InfluxDB, Point } from "@influxdata/influxdb-client";
import Metric from "../metrics/metric";
import TrackedPlayersMetric from "../metrics/impl/tracked-players";
import TrackedScoresMetric from "../metrics/impl/tracked-scores";
import BeatSaverMapsMetric from "../metrics/impl/beatsaver-maps";
import ScoresaberLeaderboardsMetric from "../metrics/impl/scoresaber-leaderboards";
import BeatLeaderScoreStatsMetric from "../metrics/impl/beatleader-score-stats";
import BeatLeaderDataStatsMetric from "../metrics/impl/beatleader-score-data";
import BeatLeaderReplaysMetric from "../metrics/impl/beatleader-replays";

const influxClient = new InfluxDB({
  url: process.env.INFLUXDB_URL!,
  token: process.env.INFLUXDB_TOKEN!,
});
const writeApi = influxClient.getWriteApi(process.env.INFLUXDB_ORG!, process.env.INFLUXDB_BUCKET!);

export default class MetricsService {
  /**
   * The registered metrics.
   * @private
   */
  private metrics: Metric[] = [];

  constructor() {
    this.registerMetric(new TrackedPlayersMetric());
    this.registerMetric(new TrackedScoresMetric());
    this.registerMetric(new BeatSaverMapsMetric());
    this.registerMetric(new ScoresaberLeaderboardsMetric());
    this.registerMetric(new BeatLeaderScoreStatsMetric());
    this.registerMetric(new BeatLeaderDataStatsMetric());
    this.registerMetric(new BeatLeaderReplaysMetric());

    setInterval(async () => {
      const before = Date.now();
      this.writePoints(await Promise.all(this.metrics.map(metric => metric.collect())));
      const timeTaken = Date.now() - before;
      if (timeTaken > 3000) {
        console.log(`SLOW!!! Collected and wrote metrics in ${timeTaken}ms`);
      }
    }, 1000 * 5); // 5 seconds
  }

  /**
   * Registers a new metric.
   *
   * @param metric the metric to register
   */
  private registerMetric(metric: Metric) {
    this.metrics.push(metric);
  }

  /**
   * Writes a point to Influx.
   *
   * @param points the points to write
   */
  private writePoints(points: Point[]) {
    writeApi.writePoints(points);
  }
}
