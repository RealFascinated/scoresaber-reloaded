"use client";

import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { formatTime } from "@ssr/common/utils/time-utils";
import GenericChart, { DatasetConfig } from "@/components/chart/generic-chart";

type Props = {
  /**
   * The score stats to use in the chart
   */
  scoreStats: ScoreStatsToken;
};

export default function PlayerScoreAccuracyChart({ scoreStats }: Props) {
  const graph = scoreStats.scoreGraphTracker.graph;

  const histories: Record<string, (number | null)[]> = {};
  const labels: string[] = [];

  for (let seconds = 0; seconds < graph.length; seconds++) {
    labels.push(formatTime(seconds));

    const history = histories["accuracy"];
    if (!history) {
      histories["accuracy"] = [];
    }
    histories["accuracy"].push(graph[seconds] * 100);
  }

  const datasetConfig: DatasetConfig[] = [
    {
      title: "Accuracy",
      field: "accuracy",
      color: "#3EC1D3",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        displayName: "Accuracy",
        position: "left",
      },
      labelFormatter: (value: number) => `${value.toFixed(2)}%`,
    },
  ];

  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
