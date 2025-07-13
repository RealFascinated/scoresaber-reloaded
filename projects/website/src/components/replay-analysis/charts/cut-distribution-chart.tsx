"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { useMemo } from "react";

type Props = {
  cutDistribution: { score: number; count: number }[];
};

const CutDistributionChart = ({ cutDistribution }: Props) => {
  const { chartData, labels } = useMemo(() => {
    if (!cutDistribution || cutDistribution.length === 0) {
      return {
        chartData: { datasets: [] },
        labels: [],
      };
    }

    // Create bins for each score from 0 to 115
    const bins = new Array(116).fill(0); // 0 to 115 inclusive = 116 bins

    cutDistribution.forEach(cut => {
      bins[cut.score] = cut.count;
    });

    // Create labels for each score
    const allLabels = Array.from({ length: 116 }, (_, i) => i.toString());

    return {
      chartData: {
        datasets: [
          {
            label: "Cut Scores",
            data: bins,
            color: "#3b82f6",
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
        displayName: "Cut Score (0-115)",
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
          text: "Cut Score Distribution (0-115)",
          color: "#ffffff",
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className="border-border bg-muted flex h-[500px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No cut data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default CutDistributionChart;
