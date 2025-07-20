"use client";

import GenericChart from "@/components/chart/generic-chart";
import { DecodedReplayResponse } from "@ssr/common/types/decoded-replay-response";
import { useMemo } from "react";
import {
  createHandDatasets,
  createTimeChartConfig,
  createTimeLabels,
  getEmptyStateClassName,
} from "./chart-utils";

type Props = {
  replayResponse: DecodedReplayResponse;
};

const SwingSpeedChart = ({ replayResponse }: Props) => {
  const { replayLengthSeconds, swingSpeed } = replayResponse;

  const { chartData, labels } = useMemo(() => {
    if (!swingSpeed || (!swingSpeed.leftSwingSpeed.length && !swingSpeed.rightSwingSpeed.length)) {
      return { chartData: { datasets: [] }, labels: [] };
    }

    const seconds = Math.ceil(replayLengthSeconds);
    const timeLabels = createTimeLabels(seconds, 2); // 2-second intervals

    // Initialize data arrays
    const leftHandData = new Array(seconds + 1).fill(null);
    const rightHandData = new Array(seconds + 1).fill(null);

    // Map swing speed data to time indices
    swingSpeed.leftSwingSpeed.forEach((speed, index) => {
      if (index < leftHandData.length) leftHandData[index] = speed;
    });
    swingSpeed.rightSwingSpeed.forEach((speed, index) => {
      if (index < rightHandData.length) rightHandData[index] = speed;
    });

    return {
      chartData: {
        datasets: createHandDatasets(
          leftHandData,
          rightHandData,
          (value: number) => `${value.toFixed(2)} m/s`
        ),
      },
      labels: timeLabels,
    };
  }, [swingSpeed, replayLengthSeconds]);

  const chartConfig = createTimeChartConfig("swing-speed", chartData.datasets, "Swing Speed (m/s)");

  if (chartData.datasets.length === 0) {
    return (
      <div className={getEmptyStateClassName()}>
        <p className="text-muted-foreground">No swing speed data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default SwingSpeedChart;
