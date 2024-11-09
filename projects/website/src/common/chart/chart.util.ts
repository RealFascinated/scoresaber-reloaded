/* eslint-disable @typescript-eslint/no-explicit-any */
import { Axis, AxisPosition, Dataset, DatasetDisplayType } from "@/common/chart/types";

export const generateChartAxis = (
  id: string,
  reverse: boolean,
  display: boolean,
  position: AxisPosition,
  displayName?: string,
  valueFormatter?: (value: number) => string
): Axis => ({
  id,
  position,
  display,
  grid: { drawOnChartArea: id === "y", color: id === "y" ? "#252525" : "" },
  title: { display: true, text: displayName, color: "#ffffff" },
  ticks: {
    stepSize: 10,
    callback: (value: number) => {
      // Apply precision if specified, otherwise default to no decimal places
      return valueFormatter !== undefined ? valueFormatter(value) : value.toString();
    },
  },
  reverse,
});

export const generateChartDataset = (
  label: string,
  data: (number | null)[],
  borderColor: string,
  yAxisID: string,
  showLegend: boolean = true,
  type?: DatasetDisplayType
): Dataset => ({
  label,
  data,
  borderColor,
  fill: false,
  lineTension: 0.5,
  spanGaps: false,
  yAxisID,
  hidden: !showLegend, // Use hidden to disable legend
  type,
  ...(type === "bar" && {
    backgroundColor: borderColor,
  }),
});
