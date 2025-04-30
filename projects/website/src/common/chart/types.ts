/* eslint-disable @typescript-eslint/no-explicit-any */

export type AxisPosition = "left" | "right";
export type DatasetDisplayType = "line" | "bar" | "point";

export type Axis = {
  id?: string;
  position?: AxisPosition;
  display?: boolean;
  grid?: { color?: string; drawOnChartArea?: boolean };
  title?: { display: boolean; text?: string; color?: string };
  ticks?: {
    stepSize?: number;
    callback?: (value: number, index: number, values: any) => string;
    font?: (context: any) => { weight: string; color?: string } | undefined;
    color?: (context: any) => string | undefined;
  };
  reverse?: boolean;
  min?: number;
  max?: number;
};

export type Dataset = {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor?: string;
  fill: boolean;
  lineTension: number;
  spanGaps: boolean;
  yAxisID: string;
  hidden?: boolean;
  stack?: string;
  order?: number;
  maxBarThickness?: number;
  type?: DatasetDisplayType;
  pointRadius?: number;
  showLine?: boolean;
};

export type DatasetConfig = {
  title: string;
  field: string;
  color: string;
  axisId: string;
  axisConfig: {
    reverse: boolean;
    display: boolean;
    hideOnMobile?: boolean;
    displayName?: string;
    position: AxisPosition;
    valueFormatter?: (value: number) => string;
    stack?: string;
    stackOrder?: number;
    min?: number;
    max?: number;
  };
  defaultLegendState?: boolean;
  type?: DatasetDisplayType;
  labelFormatter: (value: number) => string;
  pointRadius?: number;
};
