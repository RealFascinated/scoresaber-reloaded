"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
import { Button } from "@/components/ui/button";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";
import Link from "next/link";

type Props = {
  statistics: StatisticsType;
};

const datasetConfig: DatasetConfig[] = [
  {
    title: "Daily Unique Players",
    field: "activePlayers",
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
    field: "playerCount",
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
  {
    title: "Scores Set",
    field: "totalScores",
    color: "#00ff6f",
    axisId: "y",
    type: "bar",
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
    labelFormatter: (value: number) => `Scores Set: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Daily Average PP (top 100 scores)",
    field: "averagePp",
    color: Colors.ranked,
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
    labelFormatter: (value: number) => `PP: ${formatPp(value)}pp`,
  },
];

export default function ScoreSaberStatisticsChart({ statistics }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 items-center">
        <Link
          prefetch={false}
          href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
          target="_blank"
        >
          <Button>View In Grafana - More Detailed Statistics</Button>
        </Link>
      </div>

      <div className="flex-col lg:grid grid-cols-2 gap-2">
        {datasetConfig.map(config => (
          <GenericStatisticChart
            key={config.field}
            statistics={statistics}
            datasetConfig={[config]}
          />
        ))}
      </div>
    </div>
  );
}
