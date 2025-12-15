export type ChartType = "line" | "bar" | "point";

export type AxisPosition = "left" | "right";

export type ChartAxis = {
  display: boolean;
  hideOnMobile?: boolean;
  position?: "left" | "right";
  reverse?: boolean;
  displayName?: string;
  valueFormatter?: (value: number) => string;
  min?: number;
  max?: number;
};

export type ChartDataset = {
  label: string;
  data: (number | null)[] | ({ x: number; y: number } | null)[];
  color: string;
  axisId: string;
  type?: ChartType;
  pointRadius?: number;
  showLegend?: boolean;
  stack?: string;
  stackOrder?: number;
  labelFormatter?: (value: number) => string;
  field?: string; // Field name in the history object
};

export type ChartConfig = {
  id?: string;
  datasets: ChartDataset[];
  axes: Record<string, ChartAxis>;
  options?: any; // Allow custom options to be passed through
};

export type DatasetConfig = {
  title: string;
  field: string;
  color: string;
  axisId: string;
  type?: "line" | "bar" | "point";
  pointRadius?: number;
  showLegend?: boolean;
  stack?: string;
  stackOrder?: number;
  labelFormatter?: (value: number) => string;
  axisConfig: ChartAxis;
};
