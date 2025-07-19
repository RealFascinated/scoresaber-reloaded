"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { useMemo } from "react";
import { CHART_COLORS, getEmptyStateClassName } from "./chart-utils";

type Props = {
  cutDistribution: { score: number; count: number }[];
};

const CutDistributionChart = ({ cutDistribution }: Props) => {
  const { chartData, labels } = useMemo(() => {
    if (!cutDistribution || cutDistribution.length === 0) {
      return { chartData: { datasets: [] }, labels: [] };
    }

    // Create bins for each score from 0 to 115
    const bins = new Array(116).fill(0);
    cutDistribution.forEach(cut => {
      bins[cut.score] = cut.count;
    });

    const allLabels = Array.from({ length: 116 }, (_, i) => i.toString());

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
      <div className={getEmptyStateClassName(500)}>
        <p className="text-muted-foreground">No cut data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default CutDistributionChart;
