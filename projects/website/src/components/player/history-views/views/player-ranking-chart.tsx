"use client";

import React from "react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";
import { scoreBarsDataset } from "@/components/player/history-views/views/player-scores-chart";
import GenericPlayerChart from "@/components/player/history-views/generic-player-chart";
import { DatasetConfig } from "@/common/chart/types";

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
    color: "#4858ff",
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
    labelFormatter: (value: number) => `PP: ${formatPp(value)}pp`,
  },
  {
    title: "+1 PP",
    field: "plusOnePp",
    color: "#6773ff",
    axisId: "y3",
    axisConfig: {
      reverse: false,
      display: false,
      hideOnMobile: true,
      displayName: "+1 PP",
      position: "right",
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `+1 PP: ${formatPp(value)}pp`,
  },
  ...scoreBarsDataset,
];

export default function PlayerRankingChart({ player }: Props) {
  return <GenericPlayerChart id="player-ranking-chart" player={player} datasetConfig={datasetConfig} />;
}
