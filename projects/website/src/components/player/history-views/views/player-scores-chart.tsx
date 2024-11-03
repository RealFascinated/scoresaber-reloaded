"use client";

import React from "react";
import { DatasetConfig } from "@/components/chart/generic-chart";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import GenericPlayerChart from "@/components/player/history-views/generic-player-chart";

type Props = {
  player: ScoreSaberPlayer;
};

export const scoreBarsDataset: DatasetConfig[] = [
  {
    title: "Ranked Scores",
    field: "scores.rankedScores",
    color: "#ffae4d",
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Ranked Scores",
      position: "left",
    },
    type: "bar",
    labelFormatter: (value: number) => `Ranked Scores: ${formatNumberWithCommas(value)}`,
  },
  {
    title: "Unranked Scores",
    field: "scores.unrankedScores",
    color: "#616161",
    axisId: "y100",
    axisConfig: {
      reverse: false,
      display: false,
      displayName: "Unranked Scores",
      position: "left",
    },
    type: "bar",
    labelFormatter: (value: number) => `Unranked Scores: ${formatNumberWithCommas(value)}`,
  },
];

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  ...scoreBarsDataset,
  {
    title: "Total Scores",
    field: "scores.totalScores",
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
    field: "scores.totalRankedScores",
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

export default function PlayerScoresChart({ player }: Props) {
  return <GenericPlayerChart player={player} datasetConfig={datasetConfig} />;
}
