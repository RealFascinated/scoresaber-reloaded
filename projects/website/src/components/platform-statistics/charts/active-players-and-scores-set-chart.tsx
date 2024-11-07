"use client";

import React from "react";
import { DatasetConfig } from "@/components/chart/generic-chart";
import { formatNumberWithCommas, isWholeNumber } from "@ssr/common/utils/number-utils";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";

type Props = {
  statistics: StatisticsType;
};

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  {
    title: "Active Players",
    field: "activePlayers",
    color: "#4858ff",
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: false,
      displayName: "Active Players",
      position: "left",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Active Players: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Scores Set",
    field: "totalScores",
    color: "#00ff6f",
    axisId: "y1",
    type: "bar",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: false,
      displayName: "Scores Set",
      position: "right",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Scores Set: ${formatNumberWithCommas(value)}`,
  },
];

export default function ActivePlayersAndScoresSetChart({ statistics }: Props) {
  console.log("statistics", statistics);
  return <GenericStatisticChart statistics={statistics} datasetConfig={datasetConfig} />;
}
