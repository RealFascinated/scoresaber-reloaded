import { ChartConfig, ChartDataset } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import { formatTime } from "@ssr/common/utils/time-utils";

export const CHART_COLORS = {
  leftHand: Colors.hands.left,
  rightHand: Colors.hands.right,
  primary: Colors.hands.right,
} as const;

export function createTimeLabels(seconds: number, interval: number = 1): string[] {
  const labels: string[] = [];
  for (let second = 0; second <= seconds; second += interval) {
    labels.push(formatTime(second));
  }
  return labels;
}

export function createHandDatasets(
  leftHandData: (number | null)[],
  rightHandData: (number | null)[],
  labelFormatter?: (value: number) => string
): ChartDataset[] {
  return [
    {
      label: "Left Hand",
      data: leftHandData,
      color: CHART_COLORS.leftHand,
      axisId: "y",
      type: "line" as const,
      showLegend: true,
      ...(labelFormatter && { labelFormatter }),
    },
    {
      label: "Right Hand",
      data: rightHandData,
      color: CHART_COLORS.rightHand,
      axisId: "y",
      type: "line" as const,
      showLegend: true,
      ...(labelFormatter && { labelFormatter }),
    },
  ];
}

export function createTimeChartConfig(id: string, datasets: ChartDataset[], yAxisName: string): ChartConfig {
  return {
    id,
    datasets,
    axes: {
      x: {
        display: true,
        displayName: "Time (seconds)",
        hideOnMobile: false,
        valueFormatter: (value: number) => formatTime(value),
      },
      y: {
        display: true,
        displayName: yAxisName,
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
}

export function getEmptyStateClassName(height: number = 400): string {
  return `border-border bg-muted flex h-[${height}px] w-full items-center justify-center rounded-lg border`;
}
