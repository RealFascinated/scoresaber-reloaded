import { Colors } from "@/common/colors";
("use client");

import { DatasetConfig } from "@/common/chart/types";
import GenericPlayerChart from "@/components/player/views/generic-player-chart";
import { ScoreSaberPlayerHistoryEntries } from "@ssr/common/schemas/scoresaber/player/history";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type Props = {
  statisticHistory: ScoreSaberPlayerHistoryEntries;
  daysAmount: number;
};

export const scoreBarsDataset: DatasetConfig[] = [
  {
    title: "Ranked Scores",
    field: "rankedScores",
    color: Colors.series.ranked,
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: true,
      displayName: "Ranked Scores",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 0,
    labelFormatter: (value: number) => `Ranked Scores: ${value.toFixed(0)}`,
  },
  {
    title: "Ranked Improved",
    field: "rankedScoresImproved",
    color: Colors.series.rankedImproved,
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Ranked Improved",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 1,
    labelFormatter: (value: number) => `Ranked Improved: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Unranked Scores",
    field: "unrankedScores",
    color: Colors.series.unranked,
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Unranked Scores",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 3,
    labelFormatter: (value: number) => `Unranked Scores: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Unranked Improved",
    field: "unrankedScoresImproved",
    color: Colors.series.unrankedImproved,
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Unranked Improved",
      position: "left",
    },
    type: "bar",
    stack: "daily-scores",
    stackOrder: 2,
    labelFormatter: (value: number) => `Unranked Improved: ${formatNumberWithCommas(value)}`,
  },
];

const datasetConfig: DatasetConfig[] = [
  {
    title: "Total Scores",
    field: "totalScores",
    color: Colors.series.total,
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
    color: Colors.series.totalRanked,
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: false,
      hideOnMobile: true,
      displayName: "Total Ranked Scores",
      position: "right",
    },
    labelFormatter: (value: number) => `Total Ranked Scores: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Total Unranked Scores",
    field: "totalUnrankedScores",
    color: Colors.series.unranked,
    axisId: "y3",
    axisConfig: {
      reverse: false,
      display: false,
      hideOnMobile: true,
      displayName: "Total Unranked Scores",
      position: "right",
    },
    labelFormatter: (value: number) => `Total Unranked Scores: ${formatNumberWithCommas(value)}`,
  },
  ...scoreBarsDataset,
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
