"use client";

import { formatNumberWithCommas } from "@/common/number-utils";
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
    title: "Rank",
    field: "rank",
    color: "#3EC1D3",
    axisId: "y",
    axisConfig: {
      reverse: true,
      display: true,
      displayName: "Global Rank",
      position: "left",
    },
    labelFormatter: (value: number) => `Rank #${formatNumberWithCommas(value)}`,
  },
  {
    title: "Country Rank",
    field: "countryRank",
    color: "#FFEA00",
    axisId: "y1",
    axisConfig: {
      reverse: true,
      display: false,
      displayName: "Country Rank",
      position: "left",
    },
    labelFormatter: (value: number) => `Country Rank #${formatNumberWithCommas(value)}`,
  },
  {
    title: "PP",
    field: "pp",
    color: "#606fff",
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: true,
      hideOnMobile: true,
      displayName: "PP",
      position: "right",
    },
    labelFormatter: (value: number) => `PP ${formatNumberWithCommas(value)}pp`,
  },
];

export default function PlayerRankingChart({ player }: Props) {
  return <GenericPlayerChart player={player} datasetConfig={datasetConfig} />;
}
