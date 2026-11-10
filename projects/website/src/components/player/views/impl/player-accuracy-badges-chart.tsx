import { Colors } from "@/common/colors";
("use client");

import { DatasetConfig } from "@/common/chart/types";
import GenericPlayerChart from "@/components/player/views/generic-player-chart";
import { ScoreSaberPlayerHistoryEntries } from "@ssr/common/schemas/scoresaber/player/history";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

const sharedAxis = {
  reverse: false,
  display: true,
  hideOnMobile: false,
  displayName: "Plays",
  position: "left" as const,
  valueFormatter: (value: number) => formatNumberWithCommas(Math.round(value)),
};

const datasetConfig: DatasetConfig[] = [
  {
    title: "A",
    field: "aPlays",
    color: Colors.accuracy.a,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `A: ${formatNumberWithCommas(Math.round(value))}`,
  },
  {
    title: "S",
    field: "sPlays",
    color: Colors.accuracy.s,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `S: ${formatNumberWithCommas(Math.round(value))}`,
  },
  {
    title: "S+",
    field: "spPlays",
    color: Colors.accuracy.sPlus,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `S+: ${formatNumberWithCommas(Math.round(value))}`,
  },
  {
    title: "SS",
    field: "ssPlays",
    color: Colors.accuracy.ss,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `SS: ${formatNumberWithCommas(Math.round(value))}`,
  },
  {
    title: "SS+",
    field: "sspPlays",
    color: Colors.accuracy.ssPlus,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `SS+: ${formatNumberWithCommas(Math.round(value))}`,
  },
  {
    title: "GOD",
    field: "godPlays",
    color: Colors.accuracy.god,
    axisId: "y",
    axisConfig: sharedAxis,
    labelFormatter: (value: number) => `GOD: ${formatNumberWithCommas(Math.round(value))}`,
  },
];

export default function PlayerAccuracyBadgesChart({
  statisticHistory,
  daysAmount,
}: {
  statisticHistory: ScoreSaberPlayerHistoryEntries;
  daysAmount: number;
}) {
  return (
    <GenericPlayerChart
      id="player-accuracy-badges-chart"
      statisticHistory={statisticHistory}
      datasetConfig={datasetConfig}
      daysAmount={daysAmount}
    />
  );
}
