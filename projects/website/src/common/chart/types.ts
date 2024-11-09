/* eslint-disable @typescript-eslint/no-explicit-any */
export type AxisPosition = "left" | "right";
export type DatasetDisplayType = "line" | "bar";

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
};

export type Dataset = {
  label: string;
  data: (number | null)[];
  borderColor: string;
  fill: boolean;
  lineTension: number;
  spanGaps: boolean;
  yAxisID: string;
  hidden?: boolean;
  type?: DatasetDisplayType;
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
  };
  defaultLegendState?: boolean;
  type?: DatasetDisplayType;
  labelFormatter: (value: number) => string;
};
