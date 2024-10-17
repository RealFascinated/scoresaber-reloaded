"use client";

import { formatNumberWithCommas, isWholeNumber } from "@ssr/common/utils/number-utils";
import React from "react";
import { DatasetConfig } from "@/components/chart/generic-chart";
import GenericPlayerChart from "@/components/player/chart/generic-player-chart";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

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
      displayName: "Rank",
      position: "left",
    },
    labelFormatter: (value: number) => `Rank: #${formatNumberWithCommas(value)}`,
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
    labelFormatter: (value: number) => `Country Rank: #${formatNumberWithCommas(value)}`,
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
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `PP: ${formatNumberWithCommas(value)}pp`,
  },
  {
    title: "Ranked Scores",
    field: "scores.rankedScores",
    color: "#ffae4d",
    axisId: "y3",
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
    axisId: "y3",
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

export default function PlayerRankingChart({ player }: Props) {
  return <GenericPlayerChart player={player} datasetConfig={datasetConfig} />;
}
