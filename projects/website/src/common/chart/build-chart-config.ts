import type { ChartConfig, ChartDataset, DatasetConfig } from "@/common/chart/types";

type BuildChartConfigParams = {
  id: string;
  datasetConfig: readonly DatasetConfig[];
  seriesByField: Record<string, ChartDataset["data"]>;
  options?: ChartConfig["options"];
};

export function buildChartConfig({
  id,
  datasetConfig,
  seriesByField,
  options,
}: BuildChartConfigParams): ChartConfig {
  const datasets: ChartConfig["datasets"] = datasetConfig.map(config => ({
    label: config.title,
    data: seriesByField[config.field],
    color: config.color,
    axisId: config.axisId,
    type: config.type,
    pointRadius: config.pointRadius,
    showLegend: config.showLegend,
    stack: config.stack,
    stackOrder: config.stackOrder,
    labelFormatter: config.labelFormatter,
  }));

  const axes: ChartConfig["axes"] = {};
  for (const config of datasetConfig) {
    axes[config.axisId] = {
      display: config.axisConfig?.display ?? true,
      position: config.axisConfig?.position ?? "left",
      reverse: config.axisConfig?.reverse ?? false,
      displayName: config.axisConfig?.displayName ?? config.title,
      valueFormatter: config.axisConfig?.valueFormatter,
      min: config.axisConfig?.min,
      max: config.axisConfig?.max,
      hideOnMobile: config.axisConfig?.hideOnMobile,
    };
  }

  return {
    id,
    datasets,
    axes,
    ...(options ? { options } : {}),
  };
}
