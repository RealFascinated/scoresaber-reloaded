"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/api/chart/generic-chart";
import Card from "@/components/card";
import { useMemo } from "react";
import { CHART_COLORS, getEmptyStateClassName } from "./chart-utils";

type Props = {
  cutDistribution: { score: number; count: number }[];
};

export default function CutDistributionChart({ cutDistribution }: Props) {
  const { chartData, labels } = useMemo(() => {
    if (!cutDistribution || cutDistribution.length === 0) {
      return { chartData: { datasets: [] }, labels: [] };
    }

    // Create bins for each score from 0 to 15 (distance to center only)
    const bins = new Array(16).fill(0);
    cutDistribution.forEach(cut => {
      // The score is already the distance to center score (0-15)
      bins[cut.score] = cut.count;
    });
    const allLabels = Array.from({ length: 16 }, (_, i) => i.toString());

    return {
      chartData: {
        datasets: [
          {
            label: "Cuts",
            data: bins,
            color: CHART_COLORS.primary,
            axisId: "y",
            type: "bar" as const,
            showLegend: true,
          },
        ],
      },
      labels: allLabels,
    };
  }, [cutDistribution]);

  const chartConfig: ChartConfig = {
    id: "cut-distribution",
    datasets: chartData.datasets,
    axes: {
      x: {
        display: true,
        displayName: "Distance to Center (0-15)",
        hideOnMobile: false,
      },
      y: {
        display: true,
        displayName: "Number of Cuts",
        hideOnMobile: false,
        position: "left",
      },
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Distance to Center Distribution (0-15)",
          color: "#ffffff",
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className={getEmptyStateClassName(500)}>
        <p className="text-muted-foreground">No cut data available</p>
      </div>
    );
  }

  return (
    <Card className="h-[350px] w-full rounded-xl">
      <GenericChart config={chartConfig} labels={labels} />
    </Card>
  );
}
