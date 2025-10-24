"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
          <GenericStatisticChart statistics={statistics} datasetConfig={[datasetConfig[0]]} />
        </div>
        <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
          <GenericStatisticChart statistics={statistics} datasetConfig={[datasetConfig[1]]} />
        </div>
      </div>
    </div>
  );
}
