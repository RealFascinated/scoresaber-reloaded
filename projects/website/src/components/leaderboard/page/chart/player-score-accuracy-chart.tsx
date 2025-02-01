"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { formatTime } from "@ssr/common/utils/time-utils";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";

type Props = {
  /**
   * The score stats to use in the chart.
   */
  scoreStats: ScoreStatsResponse;

  /**
   * The leaderboard to the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function PlayerScoreAccuracyChart({ scoreStats, leaderboard }: Props) {
  const currentGraph = scoreStats.current.scoreGraphTracker.graph;
  const previousGraph = scoreStats.previous?.scoreGraphTracker.graph;

  console.log(currentGraph, previousGraph);

  const histories: Record<string, (number | null)[]> = {
    accuracy: [],
    previousAccuracy: [],
    pp: [],
  };
  const labels: string[] = [];

  for (let seconds = 0; seconds < currentGraph.length; seconds++) {
    labels.push(formatTime(seconds));
    const acc = currentGraph[seconds] * 100;
    histories["accuracy"].push(acc);
    if (previousGraph) {
      histories["previousAccuracy"].push(previousGraph[seconds] * 100);
    }

    if (leaderboard.ranked) {
      histories["pp"].push(scoresaberService.getPp(leaderboard.stars, acc));
    }
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
      labelFormatter: (value: number) => `Accuracy: ${value.toFixed(2)}%`,
    },
    {
      title: "Previous Accuracy",
      field: "previousAccuracy",
      color: "#d3a93e",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        displayName: "Previous Accuracy",
        position: "left",
      },
      labelFormatter: (value: number) => `Previous Accuracy: ${value.toFixed(2)}%`,
    },
    {
      title: "PP",
      field: "pp",
      color: "#4858ff",
      axisId: "y1",
      axisConfig: {
        reverse: false,
        display: true,
        hideOnMobile: true,
        displayName: "PP",
        position: "right",
      },
      labelFormatter: (value: number) => `PP: ${value.toFixed(2)}pp`,
    },
  ];

  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
