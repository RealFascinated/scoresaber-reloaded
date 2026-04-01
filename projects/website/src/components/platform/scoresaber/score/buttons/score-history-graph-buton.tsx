"use client";

import type { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, getDaysAgo, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon } from "lucide-react";
import { useState } from "react";
import { buildChartConfig } from "../../../../../common/chart/build-chart-config";
import { Colors } from "../../../../../common/colors";
import GenericChart from "../../../../api/chart/generic-chart-dynamic";
import ScoreButton from "../../../../score/button/score-button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../../../ui/dialog";

export default function ScoreHistoryGraphButton({ score }: { score: ScoreSaberScore }) {
  const [open, setOpen] = useState(false);

  const { data: scoreHistoryGraph } = useQuery<ScoreHistoryGraph | undefined>({
    queryKey: ["score-history-graph", score.playerId, score.leaderboardId],
    queryFn: async () => ssrApi.fetchScoreHistoryGraph(score.playerId, score.leaderboardId),
    enabled: open,
  });

  const orderedPoints = (scoreHistoryGraph ?? []).toSorted(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const labels = orderedPoints.map(point => point.timestamp.getTime());
  const formatRelativeDate = (value: number, withTime: boolean) => {
    const date = new Date(value);
    if (getDaysAgo(date) <= 7) {
      return timeAgo(date, 1);
    }
    return formatDate(date, withTime ? "Do MMMM, YYYY HH:mm a" : "DD MMMM YYYY");
  };

  const chartConfig = buildChartConfig({
    id: "score-history-graph",
    datasetConfig: [
      {
        field: "accuracy",
        title: "Accuracy",
        color: Colors.generic.green,
        axisId: "y",
        pointRadius: 3,
        labelFormatter: value => `Accuracy: ${value.toFixed(2)}%`,
        axisConfig: {
          display: true,
          displayName: "Accuracy",
          position: "left",
          valueFormatter: value => `${value.toFixed(2)}%`,
        },
      },
    ],
    seriesByField: {
      accuracy: orderedPoints.map(point => point.accuracy),
    },
    options: {
      scales: {
        x: {
          type: "linear",
          ticks: {
            callback: tickValue => {
              const value = typeof tickValue === "number" ? tickValue : Number(tickValue);
              return formatRelativeDate(value, false);
            },
          },
        },
      },
    },
  });
  chartConfig.axes.x = {
    display: true,
    displayName: "",
    valueFormatter: (value: number) => formatRelativeDate(value, true),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ScoreButton tooltip={<p>View Score History Graph</p>}>
          <ChartBarIcon className="h-4 w-4" />
        </ScoreButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle>Score Graph</DialogTitle>

        <div className="h-[400px]">
          <GenericChart config={chartConfig} labels={labels} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
