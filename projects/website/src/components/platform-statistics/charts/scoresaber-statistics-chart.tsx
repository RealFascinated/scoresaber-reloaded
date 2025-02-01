"use client";

import React from "react";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { DatasetConfig } from "@/common/chart/types";

type Props = {
  statistics: StatisticsType;
};

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  {
    title: "Active Players",
    field: "activePlayers",
    color: "#ff4f4f",
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
    title: "Average PP (top 100 scores)",
    field: "averagePp",
    color: "#4858ff",
    axisId: "y1",
    axisConfig: {
      reverse: false,
      display: false,
      hideOnMobile: false,
      displayName: "Average PP (top 100 scores)",
      position: "right",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Average PP: ${formatPp(value)}`,
  },
  {
    title: "Scores Set",
    field: "totalScores",
    color: "#00ff6f",
    axisId: "y2",
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

export default function ScoreSaberStatisticsChart({ statistics }: Props) {
  return <GenericStatisticChart statistics={statistics} datasetConfig={datasetConfig} />;
}
