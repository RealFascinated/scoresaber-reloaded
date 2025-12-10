"use client";

import { ChartConfig, DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/api/chart/generic-chart";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
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
            axisId: "y1",
            axisConfig: {
              reverse: false,
              display: false,
              displayName: "Previous Accuracy",
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
            color: Colors.ranked,
            axisId: "y2",
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

  const config: ChartConfig = {
    id: "player-score-accuracy-chart",
    options: {
      animation: true,
    },
    datasets: datasetConfig.map(config => ({
      label: config.title,
      data: histories[config.field],
      color: config.color,
      axisId: config.axisId,
      type: config.type,
      pointRadius: config.pointRadius,
      showLegend: config.showLegend,
      stack: config.stack,
      stackOrder: config.stackOrder,
      labelFormatter: config.labelFormatter,
    })),
    axes: Object.fromEntries(
      datasetConfig.map(config => [
        config.axisId,
        {
          display: config.axisConfig?.display ?? true,
          position: config.axisConfig?.position ?? "left",
          reverse: config.axisConfig?.reverse ?? false,
          displayName: config.axisConfig?.displayName ?? config.title,
          valueFormatter: config.axisConfig?.valueFormatter,
          min: config.axisConfig?.min,
          max: config.axisConfig?.max,
          hideOnMobile: config.axisConfig?.hideOnMobile,
        },
      ])
    ),
  };

  return (
    <div className="bg-card border-border flex h-[330px] w-full flex-col items-center justify-center rounded-xl border p-4">
      <GenericChart labels={labels} config={config} />
    </div>
  );
}
