"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/api/chart/generic-chart-dynamic";
import Card from "@/components/card";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
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
      histories["pp"].push(ScoreSaberCurve.getPp(leaderboard.stars, acc));
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
    ...(scoreStats.previous
      ? [
          {
            title: "Previous Accuracy",
            field: "previousAccuracy",
            color: Colors.rankedLight,
            axisId: "y",
            axisConfig: {
              reverse: false,
              display: true,
              displayName: "Accuracy",
              position: "left" as const,
            },
            labelFormatter: (value: number) => `Previous Accuracy: ${value.toFixed(2)}%`,
          },
        ]
      : []),
    ...(leaderboard.ranked
      ? [
          {
            title: "PP",
            field: "pp",
            color: Colors.pp,
            axisId: "y1",
            axisConfig: {
              reverse: false,
              display: true,
              hideOnMobile: true,
              displayName: "PP",
              position: "right" as const,
            },
            labelFormatter: (value: number) => `PP: ${value.toFixed(2)}pp`,
          },
        ]
      : []),
  ];

  const config = buildChartConfig({
    id: "player-score-accuracy-chart",
    datasetConfig,
    seriesByField: histories,
  });

  return (
    <Card className="h-[330px] w-full rounded-xl">
      <GenericChart labels={labels} config={config} />
    </Card>
  );
}
