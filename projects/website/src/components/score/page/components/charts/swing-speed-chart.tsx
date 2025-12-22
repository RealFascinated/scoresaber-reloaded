"use client";

import { ChartConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/api/chart/generic-chart";
import Card from "@/components/card";
import { useMemo } from "react";
import { getEmptyStateClassName } from "./chart-utils";

type Props = {
  swingSpeed: {
    rightSwingSpeed: number[];
    leftSwingSpeed: number[];
  };
  replayLengthSeconds: number;
};

export default function SwingSpeedChart({ swingSpeed, replayLengthSeconds }: Props) {
  const { chartData, labels } = useMemo(() => {
    if (!swingSpeed || swingSpeed.leftSwingSpeed.length === 0 || swingSpeed.rightSwingSpeed.length === 0) {
      return { chartData: { datasets: [] }, labels: [] };
    }

    const dataLength = Math.max(swingSpeed.leftSwingSpeed.length, swingSpeed.rightSwingSpeed.length);
    const timeLabels = Array.from({ length: dataLength }, (_, i) => {
      return (i * 2).toString();
    });

    return {
      chartData: {
        datasets: [
          {
            label: "Left Hand",
            data: swingSpeed.leftSwingSpeed,
            color: Colors.hands.left,
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
          {
            label: "Right Hand",
            data: swingSpeed.rightSwingSpeed,
            color: Colors.hands.right,
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
        ],
      },
      labels: timeLabels,
    };
  }, [swingSpeed]);

  const chartConfig: ChartConfig = {
    id: "swing-speed",
    datasets: chartData.datasets,
    axes: {
      x: {
        display: true,
        displayName: "Time (seconds)",
        hideOnMobile: false,
      },
      y: {
        display: true,
        displayName: "Swing Speed (m/s)",
        hideOnMobile: false,
        position: "left",
      },
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Swing Speed Over Time (2s average)",
          color: "#ffffff",
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className={getEmptyStateClassName(500)}>
        <p className="text-muted-foreground">No swing speed data available</p>
      </div>
    );
  }

  return (
    <Card className="h-[350px] w-full rounded-xl">
      <GenericChart config={chartConfig} labels={labels} />
    </Card>
  );
}
