"use client";

import React from "react";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";
import GenericStatisticChart from "@/components/platform-statistics/generic-statistic-chart";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { DatasetConfig } from "@/common/chart/types";

type Props = {
  statistics: StatisticsType;
};

const datasetConfig: DatasetConfig[] = [
  {
    title: "Active Players",
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
    labelFormatter: (value: number) => `Active Players: ${formatNumberWithCommas(value)}`,
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
    labelFormatter: (value: number) => `Active Players: ${formatNumberWithCommas(value)}`,
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
    color: "#4858ff",
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
    <div className="flex flex-col lg:grid grid-cols-2 gap-2">
      {datasetConfig.map(config => (
        <GenericStatisticChart key={config.field} statistics={statistics} datasetConfig={[config]} />
      ))}
    </div>
  );
}
