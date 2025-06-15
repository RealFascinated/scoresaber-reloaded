import { ChartAxis, ChartDataset } from "./types";

export const createChartAxis = (
  display: boolean,
  hideOnMobile?: boolean,
  position?: "left" | "right",
  reverse?: boolean,
  displayName?: string,
  valueFormatter?: (value: number) => string,
  min?: number,
  max?: number
): ChartAxis => {
  return {
    display,
    hideOnMobile,
    position,
    reverse,
    displayName,
    valueFormatter,
    min,
    max,
  };
};

export const createChartDataset = (
  label: string,
  data: (number | null)[],
  color: string,
  axisId: string,
  type?: "line" | "bar" | "point",
  pointRadius?: number,
  showLegend?: boolean,
  stack?: string,
  stackOrder?: number,
  labelFormatter?: (value: number) => string
): ChartDataset => {
  return {
    label,
    data,
    color,
    axisId,
    type,
    pointRadius,
    showLegend,
    stack,
    stackOrder,
    labelFormatter,
  };
};
