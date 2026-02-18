"use client";

import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import type { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ssrApi } from "@ssr/common/utils/ssr-api";
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

  const labels = scoreHistoryGraph?.map(point => point.timestamp) || [];

  const chartConfig = buildChartConfig({
    id: "score-history-graph",
    datasetConfig: [
      {
        field: "accuracy",
        title: "Accuracy",
        color: Colors.generic.green,
        axisId: "y",
        axisConfig: {
          display: true,
          displayName: "Accuracy",
          position: "left",
        },
      },
    ],
    seriesByField: {
      accuracy: scoreHistoryGraph?.map(point => point.accuracy) || [],
    },
  });

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
