"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/chart/generic-chart";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { formatTime } from "@ssr/common/utils/time-utils";

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
      histories["pp"].push(
        ApiServiceRegistry.getInstance().getScoreSaberService().getPp(leaderboard.stars, acc)
      );
    }
  }

  const datasetConfig: DatasetConfig[] = [
    {
      title: "Accuracy",
      field: "accuracy",
      color: Colors.generic.green,
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
      color: Colors.rankedLight,
      axisId: "y1",
      axisConfig: {
        reverse: false,
        display: false,
        displayName: "Previous Accuracy",
        position: "left",
      },
      labelFormatter: (value: number) => `Previous Accuracy: ${value.toFixed(2)}%`,
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
      },
      labelFormatter: (value: number) => `PP: ${value.toFixed(2)}pp`,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full p-4 rounded-xl bg-accent-deep border border-border backdrop-blur-sm">
      <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
    </div>
  );
}
