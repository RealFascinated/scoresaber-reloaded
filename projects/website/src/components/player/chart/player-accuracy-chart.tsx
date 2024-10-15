"use client";

import React from "react";
import { DatasetConfig } from "@/components/chart/generic-chart";
import GenericPlayerChart from "@/components/player/chart/generic-player-chart";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";
import { isWholeNumber } from "@ssr/common/utils/number-utils";

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
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `Average Ranked Accuracy: ${value.toFixed(3)}%`,
  },
];

export default function PlayerAccuracyChart({ player }: Props) {
  return <GenericPlayerChart player={player} datasetConfig={datasetConfig} />;
}
