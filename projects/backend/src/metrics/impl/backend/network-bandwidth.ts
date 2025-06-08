import { Point } from "@influxdata/influxdb-client";
import pidusage from "pidusage";
import { MetricType } from "../../../service/metrics.service";
import Metric from "../../metric";

interface NetworkStats {
  bytesReceived: number;
  bytesTransmitted: number;
  timestamp: number;
}

export default class NetworkBandwidthMetric extends Metric<{
  bytesReceivedPerSecond: number;
  bytesTransmittedPerSecond: number;
}> {
  private lastStats: NetworkStats | null = null;
  private readonly pid: number;

  constructor() {
    super(
      MetricType.NETWORK_BANDWIDTH,
      {
        bytesReceivedPerSecond: 0,
        bytesTransmittedPerSecond: 0,
      },
      {
        interval: 1000, // Collect every second
        fetchAfterRegister: false,
      }
    );
    this.pid = process.pid;
  }

  private async getNetworkStats(): Promise<NetworkStats> {
    const stats = await pidusage(this.pid);

    return {
      bytesReceived: stats.network?.rx || 0,
      bytesTransmitted: stats.network?.tx || 0,
      timestamp: Date.now(),
    };
  }

  public async collect(): Promise<Point | undefined> {
    const currentStats = await this.getNetworkStats();
    let bytesReceivedPerSecond = 0;
    let bytesTransmittedPerSecond = 0;

    if (this.lastStats) {
      const timeDiff = (currentStats.timestamp - this.lastStats.timestamp) / 1000; // Convert to seconds
      bytesReceivedPerSecond =
        (currentStats.bytesReceived - this.lastStats.bytesReceived) / timeDiff;
      bytesTransmittedPerSecond =
        (currentStats.bytesTransmitted - this.lastStats.bytesTransmitted) / timeDiff;
    }

    this.lastStats = currentStats;
    this.value = {
      bytesReceivedPerSecond,
      bytesTransmittedPerSecond,
    };

    return new Point(this.id)
      .floatField("bytesReceivedPerSecond", bytesReceivedPerSecond)
      .floatField("bytesTransmittedPerSecond", bytesTransmittedPerSecond);
  }
}
