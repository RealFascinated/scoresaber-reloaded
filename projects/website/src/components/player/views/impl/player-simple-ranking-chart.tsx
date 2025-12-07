"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericPlayerChart from "@/components/player/views/generic-player-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { formatNumberWithCommas, formatPp, isWholeNumber } from "@ssr/common/utils/number-utils";

type Props = {
  statisticHistory: PlayerStatisticHistory;
  daysAmount: number;
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
    title: "PP",
    field: "pp",
    color: Colors.ranked,
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: true,
      displayName: "PP",
      position: "right",
      hideOnMobile: true,
      valueFormatter: value => {
        if (isWholeNumber(value)) {
          return value.toString();
        }
        return value.toFixed(1);
      },
    },
    labelFormatter: (value: number) => `PP: ${formatPp(value)}pp`,
  },
];

export default function PlayerSimpleRankingChart({ statisticHistory, daysAmount }: Props) {
  return (
    <GenericPlayerChart
      id="player-simple-ranking-chart"
      statisticHistory={statisticHistory}
      datasetConfig={datasetConfig}
      daysAmount={daysAmount}
    />
  );
}
