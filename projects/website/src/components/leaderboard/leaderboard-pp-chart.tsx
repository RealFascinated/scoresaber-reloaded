"use client";

import React from "react";
import GenericChart, { DatasetConfig } from "@/components/chart/generic-chart";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import Card from "@/components/card";

type Props = {
  /**
   * The player the chart is for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardPpChart({ leaderboard }: Props) {
  const histories: Record<string, (number | null)[]> = {};
  const labels: string[] = [];

  for (let accuracy = 60; accuracy <= 100; accuracy += 0.2) {
    const label = accuracy.toFixed(2) + "%";
    labels.push(label);

    const history = histories["pp"];
    if (!history) {
      histories["pp"] = [];
    }
    histories["pp"].push(scoresaberService.getPp(leaderboard.stars, accuracy));
  }

  const datasetConfig: DatasetConfig[] = [
    {
      title: "PP",
      field: "pp",
      color: "#3EC1D3",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        displayName: "PP",
        position: "left",
      },
      labelFormatter: (value: number) => `${value.toFixed(2)}pp`,
    },
  ];

  return (
    <Card className="h-64 w-full">
      <p className="font-semibold">PP Curve</p>
      <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
    </Card>
  );
}
