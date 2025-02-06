"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericPlayerChart from "@/components/player/history-views/generic-player-chart";
import { scoreBarsDataset } from "@/components/player/history-views/views/player-scores-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";

type Props = {
  statisticHistory: PlayerStatisticHistory;
};

// Dataset configuration for the chart
const datasetConfig: DatasetConfig[] = [
  {
    title: "Rank",
    field: "rank",
    color: "#2ecc71",
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
    color: Colors.ranked,
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
    color: Colors.rankedLight,
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

export default function PlayerRankingChart({ statisticHistory }: Props) {
  return (
    <GenericPlayerChart
      id="player-ranking-chart"
      statisticHistory={statisticHistory}
      datasetConfig={datasetConfig}
    />
  );
}
