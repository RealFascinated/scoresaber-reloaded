"use client";

import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import React from "react";
import { DatasetConfig } from "@/components/chart/generic-chart";
import GenericPlayerChart from "@/components/player/chart/generic-player-chart";

type Props = {
  player: ScoreSaberPlayer;
};

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  {
    title: "Average Ranked Accuracy",
    field: "accuracy.averageRankedAccuracy",
    color: "#606fff",
    axisId: "y",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: false,
      displayName: "Average Ranked Accuracy",
      position: "left",
    },
    labelFormatter: (value: number) => `Average Ranked Accuracy ${value.toFixed(2)}%`,
  },
];

export default function PlayerAccuracyChart({ player }: Props) {
  return <GenericPlayerChart player={player} datasetConfig={datasetConfig} />;
}
