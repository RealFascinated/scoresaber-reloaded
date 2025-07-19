"use client";

import { ChartConfig, ChartDataset } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { DecodedReplayResponse } from "@ssr/common/types/decoded-replay-response";
import { formatTime } from "@ssr/common/utils/time-utils";
import { useMemo } from "react";

type Props = {
  replayResponse: DecodedReplayResponse;
};

const SwingSpeedChart = ({ replayResponse }: Props) => {
  const { replayLengthSeconds, swingSpeed } = replayResponse;

  const { chartData, labels } = useMemo(() => {
    if (!swingSpeed || (!swingSpeed.leftSwingSpeed.length && !swingSpeed.rightSwingSpeed.length)) {
      return {
        chartData: { datasets: [] },
        labels: [],
      };
    }

    // Calculate time labels based on replay length
    const seconds = Math.ceil(replayLengthSeconds);
    const timeLabels: string[] = [];
        
    // Create time labels for each second
    for (let second = 0; second <= seconds; second+=2) {
      timeLabels.push(formatTime(second));
    }

    // Process swing speed data
    const leftHandData: (number | null)[] = [];
    const rightHandData: (number | null)[] = [];

    // Initialize arrays with null values for each second
    for (let second = 0; second <= seconds; second++) {
      leftHandData.push(null);
      rightHandData.push(null);
    }

    // Process left hand swing speed data
    swingSpeed.leftSwingSpeed.forEach((speed: number, index: number) => {
      if (index < leftHandData.length) {
        leftHandData[index] = speed;
      }
    });

    // Process right hand swing speed data
    swingSpeed.rightSwingSpeed.forEach((speed: number, index: number) => {
      if (index < rightHandData.length) {
        rightHandData[index] = speed;
      }
    });

    return {
      chartData: {
        datasets: [
          {
            label: "Left Hand",
            data: leftHandData,
            color: "#ef4444",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
            labelFormatter: (value: number) => `${value.toFixed(2)} m/s`,
          },
          {
            label: "Right Hand",
            data: rightHandData,
            color: "#3b82f6",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
            labelFormatter: (value: number) => `${value.toFixed(2)} m/s`,
          },
        ] as ChartDataset[],
      },
      labels: timeLabels,
    };
  }, [swingSpeed, replayLengthSeconds]);

  const chartConfig: ChartConfig = {
    id: "swing-speed",
    datasets: chartData.datasets,
    axes: {
      x: {
        display: true,
        displayName: "Time (seconds)",
        hideOnMobile: false,
        valueFormatter: (value: number) => formatTime(value),
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
          display: false,
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className="border-border bg-muted flex h-[400px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No swing speed data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default SwingSpeedChart;
