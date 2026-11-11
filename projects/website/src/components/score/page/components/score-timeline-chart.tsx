"use client";

import { chartTitle } from "@/common/chart/chart-theme";
import { ChartConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/api/chart/generic-chart-dynamic";
import Card from "@/components/card";
import { useMemo } from "react";

type Props = {
  labels: string[];
  /** Average points per hit for each time slice, or null when the hand had no hits in it. */
  left: (number | null)[];
  right: (number | null)[];
  /** Misses and bad cuts in each time slice. */
  mistakes: number[];
  minScore: number;
};

const MAX_SCORE = 115;

export default function ScoreTimelineChart({ labels, left, right, mistakes, minScore }: Props) {
  const config = useMemo<ChartConfig>(() => {
    const hasMistakes = mistakes.some(count => count > 0);

    return {
      id: "score-timeline",
      datasets: [
        {
          label: "Left Hand",
          data: left,
          color: Colors.hands.left,
          axisId: "y",
          type: "line",
          showLegend: true,
        },
        {
          label: "Right Hand",
          data: right,
          color: Colors.hands.right,
          axisId: "y",
          type: "line",
          showLegend: true,
        },
        ...(hasMistakes
          ? [
              {
                label: "Misses and bad cuts",
                data: mistakes,
                color: "var(--danger)",
                axisId: "y2",
                type: "bar" as const,
                showLegend: true,
              },
            ]
          : []),
      ],
      axes: {
        x: { display: true, displayName: "Time", hideOnMobile: false },
        y: {
          display: true,
          displayName: "Average points per hit",
          hideOnMobile: false,
          position: "left",
          min: minScore,
          max: MAX_SCORE,
        },
        ...(hasMistakes
          ? {
              y2: {
                display: true,
                displayName: "Misses and bad cuts",
                hideOnMobile: true,
                position: "right" as const,
                min: 0,
              },
            }
          : {}),
      },
      options: {
        plugins: {
          title: chartTitle("Score Over Time"),
        },
      },
    };
  }, [left, right, mistakes, minScore]);

  return (
    <Card className="h-[350px] w-full rounded-xl">
      <GenericChart config={config} labels={labels} />
    </Card>
  );
}
