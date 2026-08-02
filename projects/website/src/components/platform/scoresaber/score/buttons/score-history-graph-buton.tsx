"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SharedIcons } from "@/shared-icons";
import type { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, getDaysAgo, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
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
          <SharedIcons.ScoreHistoryChartIcon className="h-4 w-4" />
        </ScoreButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogTitle>Score Graph</DialogTitle>

        <div className="flex w-full flex-col gap-4 md:flex-row">
          <div className="min-w-0 flex-1">
            <div className="h-[400px]">
              <GenericChart config={chartConfig} labels={labels} />
            </div>
          </div>

          <div className="ring-border bg-card hidden w-full shrink-0 flex-col overflow-hidden rounded-xl ring-1 md:flex md:w-72">
            <p className="text-foreground border-border/80 border-b px-3 py-2 text-sm font-semibold">
              Score History
            </p>
            <div className="max-h-[400px] overflow-y-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3">Date</TableHead>
                    <TableHead className="px-3 text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedPoints.map(point => (
                    <TableRow key={point.timestamp.getTime()} className="hover:bg-accent/40 tabular-nums">
                      <TableCell className="text-muted-foreground px-3 py-1.5 whitespace-nowrap">
                        {formatRelativeDate(point.timestamp.getTime(), true)}
                      </TableCell>
                      <TableCell className="px-3 py-1.5 text-right text-green-400">
                        {point.accuracy.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
