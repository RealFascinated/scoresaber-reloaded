import { Gauge } from "@prometheus-io/client";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { BeatLeaderApiService } from "../../../service/external/beatleader-api.service";
import NumberMetric from "../../number-metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export default class BeatLeaderPlayersMetric extends NumberMetric {
  private static readonly logger: ScopedLogger = Logger.withTopic("Metric: BeatLeader Players");

  constructor() {
    super(MetricType.BEATLEADER_PLAYERS, 0);

    const gauge = new Gauge({
      name: "beatleader_players",
      help: "Total number of BeatLeader players",
      registers: [prometheusRegistry],
      collect: async () => {
        const result = await BeatLeaderApiService.lookupPlayersTotal();
        if (!result.ok) {
          BeatLeaderPlayersMetric.logger.warn(
            `Failed to look up BeatLeader players total: ${result.message}`
          );
        } else if (Number.isFinite(result.response)) {
          this.value = result.response;
        }
        gauge.set(this.value ?? 0);
      },
    });
  }
}
