"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { formatNumberWithCommas, isWholeNumber } from "@ssr/common/utils/number-utils";

type Props = {
  statistics: StatisticsType;
};

const datasetConfig: DatasetConfig[] = [
  {
    title: "Daily Unique Players",
    field: Statistic.DailyUniquePlayers,
    color: "#754fff",
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      position: "left",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Players: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Active Accounts",
    field: Statistic.ActiveAccounts,
    color: "#754fff",
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      position: "left",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Accounts: ${formatNumberWithCommas(value)}`,
  },
];

export default function ScoreSaberStatisticsChart({ statistics }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-center gap-2">
        <SimpleLink
          href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
          target="_blank"
          className="w-fit"
        >
          <Button>View in Grafana</Button>
        </SimpleLink>
      </div>

      <div className="grid-cols-2 flex-col gap-2 lg:grid">
        <GenericStatisticChart statistics={statistics} datasetConfig={[datasetConfig[0]]} />
        <GenericStatisticChart statistics={statistics} datasetConfig={[datasetConfig[1]]} />
      </div>
    </div>
  );
}
