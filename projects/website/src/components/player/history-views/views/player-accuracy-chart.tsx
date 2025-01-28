"use client";

import React from "react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { isWholeNumber } from "@ssr/common/utils/number-utils";
import GenericPlayerChart from "@/components/player/history-views/generic-player-chart";
import { DatasetConfig } from "@/common/chart/types";

type Props = {
  player: ScoreSaberPlayer;
};

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  {
    title: "Average Ranked Accuracy",
    field: "accuracy.averageRankedAccuracy",
    color: "#4858ff",
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
    field: "accuracy.averageUnrankedAccuracy",
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
  {
    title: "Average Accuracy",
    field: "accuracy.averageAccuracy",
    color: "#48ff58", // Changed to green
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
];

export default function PlayerAccuracyChart({ player }: Props) {
  return <GenericPlayerChart id="player-accuracy-chart" player={player} datasetConfig={datasetConfig} />;
}
