import { Point } from "@influxdata/influxdb-client";
import systeminformation from "systeminformation";
import { MetricType } from "../../../service/metrics.service";
import NumberMetric from "../../number-metric";

export default class SystemNetworkIoMetric extends NumberMetric {
  constructor() {
    super(MetricType.SYSTEM_NETWORK_IO, 0, {
      fetchAndStore: false,
      interval: 1000 * 5, // 5 seconds
    });
  }

  public async collect(): Promise<Point | undefined> {
    const networkStats = await systeminformation.networkStats();
    const interfaceStats = networkStats.find(stat => {
      if (
        (!stat.iface.startsWith("eno") && !stat.iface.startsWith("enp")) ||
        stat.operstate !== "up"
      ) {
        return false;
      }
      return true;
    });
    if (!interfaceStats) {
      return undefined;
    }

    // Will be null on the first run
    if (interfaceStats.rx_sec === null || interfaceStats.tx_sec === null) {
      return undefined;
    }

    return this.getPointBase()
      .floatField("in", interfaceStats.rx_sec)
      .floatField("out", interfaceStats.tx_sec);
  }
}
