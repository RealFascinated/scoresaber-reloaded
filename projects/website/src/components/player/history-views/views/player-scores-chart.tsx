"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericPlayerChart from "@/components/player/history-views/generic-player-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type Props = {
  statisticHistory: PlayerStatisticHistory;
  daysAmount: number;
};

export const scoreBarsDataset: DatasetConfig[] = [
  {
    title: "Ranked Scores",
    field: "rankedScores",
    color: Colors.ranked,
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      displayName: "Ranked Scores",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 0,
    labelFormatter: (value: number) => `${value.toFixed(0)}`,
  },
  {
    title: "Unranked Scores",
    field: "unrankedScores",
    color: "#616161",
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Unranked Scores",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 1,
    labelFormatter: (value: number) => `Unranked Scores: ${formatNumberWithCommas(value)}`,
  },
];

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  ...scoreBarsDataset,
  {
    title: "Total Scores",
    field: "totalScores",
    color: "#616161",
    axisId: "y1",
    axisConfig: {
      reverse: false,
      display: true,
      displayName: "Total Scores",
      position: "left",
    },
    labelFormatter: (value: number) => `Total Scores: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Total Ranked Scores",
    field: "totalRankedScores",
    color: "#6773ff",
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: true,
      displayName: "Total Ranked Scores",
      position: "right",
    },
    labelFormatter: (value: number) => `Total Ranked Scores: ${formatNumberWithCommas(value)}`,
  },
];

export default function PlayerScoresChart({ statisticHistory, daysAmount }: Props) {
  return (
    <GenericPlayerChart
      id="player-scores-chart"
      statisticHistory={statisticHistory}
      datasetConfig={datasetConfig}
      daysAmount={daysAmount}
    />
  );
}
