"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericPlayerChart from "@/components/player/views/generic-player-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { isWholeNumber } from "@ssr/common/utils/number-utils";

const datasetConfig: DatasetConfig[] = [
  {
    title: "Average Accuracy",
    field: "averageAccuracy",
    color: "#48ff58",
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: false,
      displayName: "Average Accuracy",
      position: "right",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Average Accuracy: ${value.toFixed(3)}%`,
  },
  {
    title: "Average Ranked Accuracy",
    field: "averageRankedAccuracy",
    color: Colors.ranked,
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: false,
      displayName: "Average Ranked Accuracy",
      position: "left",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Average Ranked Accuracy: ${value.toFixed(3)}%`,
  },
  {
    title: "Average Unranked Accuracy",
    field: "averageUnrankedAccuracy",
    color: "#ff4848", // Changed to red
    axisId: "y1",
    axisConfig: {
      reverse: false,
      display: false,
      hideOnMobile: false,
      displayName: "Average Unranked Accuracy",
      position: "left",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Average Unranked Accuracy: ${value.toFixed(3)}%`,
  },
];

export default function PlayerAccuracyChart({
  statisticHistory,
  daysAmount,
}: {
  statisticHistory: PlayerStatisticHistory;
  daysAmount: number;
}) {
  return (
    <GenericPlayerChart
      id="player-accuracy-chart"
      statisticHistory={statisticHistory}
      datasetConfig={datasetConfig}
      daysAmount={daysAmount}
    />
  );
}
