"use client";

import { DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/chart/generic-chart";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

type ScoreHistoryGraphScore = {
  score: number;
  accuracy: number;
  misses: number;
  pp: number;
  timestamp: Date;
};

type ScoreHistoryProps = {
  /**
   * The player who set this score.
   */
  playerId: string;

  /**
   * The leaderboard the score was set on.
   */
  leaderboardId: string;
};

export function ScoreHistoryGraph({ playerId, leaderboardId }: ScoreHistoryProps) {
  const { data: scoreHistory, isLoading } = useQuery({
    queryKey: ["scoreHistory", playerId, leaderboardId],
    queryFn: () => ssrApi.getScoreHistoryGraph(playerId, leaderboardId),
  });

  if (isLoading || !scoreHistory) {
    return null;
  }

  const datasetConfig: DatasetConfig[] = [
    ...(!scoreHistory.isRanked
      ? [
          {
            title: "Score",
            field: "score",
            color: Colors.primary,
            axisId: "y",
            axisConfig: {
              reverse: false,
              display: true,
              position: "right" as const,
              displayName: "Score",
              valueFormatter: formatNumberWithCommas,
            },
            labelFormatter: (value: number) => `Score: ${formatNumberWithCommas(value)}`,
          },
        ]
      : [
          {
            title: "PP",
            field: "pp",
            color: Colors.ssr,
            axisId: "y",
            axisConfig: {
              reverse: false,
              display: true,
              position: "right" as const,
              displayName: "PP",
              valueFormatter: formatPp,
            },
            labelFormatter: (value: number) => `PP: ${formatPp(value)}`,
          },
        ]),
    {
      title: "Accuracy",
      field: "accuracy",
      color: Colors.generic.green,
      axisId: "y2",
      axisConfig: {
        reverse: false,
        display: true,
        position: "left" as const,
        displayName: "Accuracy",
        valueFormatter: (value: number) => `${value.toFixed(2)}%`,
      },
      labelFormatter: (value: number) => `Accuracy: ${value.toFixed(2)}%`,
    },
  ];

  const labels = scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.timestamp);
  const histories = {
    score: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.score),
    pp: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.pp),
    accuracy: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.accuracy),
  };

  return (
    <GenericChart
      options={{
        id: `score-history-${playerId}-${leaderboardId}`,
      }}
      labels={labels}
      datasetConfig={datasetConfig}
      histories={histories}
    />
  );
}
