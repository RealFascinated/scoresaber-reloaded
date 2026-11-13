"use client";

import { createChartMarkerPlugin, type ChartMarker } from "@/common/chart/chart-markers";
import { applyChartTheme, CHART_THEME, chartTitle } from "@/common/chart/chart-theme";
import { ChartConfig } from "@/common/chart/types";
import { useIsMobile } from "@/contexts/viewport-context";
import { useCanvasColors } from "@/hooks/use-canvas-colors";
import { useUpdateUserPreferences, useUserPreference } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import {
  formatChartDate,
  formatDate,
  formatDateMinimal,
  getDaysAgo,
  getDaysAgoDate,
  parseDate,
  timeAgo,
} from "@ssr/common/utils/time-utils";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartEvent,
  type ChartOptions,
  type LegendElement,
  type LegendItem,
  type ScriptableContext,
  type ScriptableLineSegmentContext,
  type TooltipItem,
} from "chart.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart as ChartComponent } from "react-chartjs-2";

dayjs.extend(utc);

Chart.register(
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  BarController,
  LineController
);
applyChartTheme();

type Props = {
  config: ChartConfig;
  labels: Date[] | string[] | number[];
  /** Vertical lines to draw on the chart. Only valid for charts with a category x axis. */
  markers?: ChartMarker[];
};

type LineChartOptions = ChartOptions<"line">;
type LineScales = NonNullable<LineChartOptions["scales"]>;

// Datasets are either "bar" or "line" (points are drawn as lines with a point radius)
type MixedChartMode = "bar" | "line";

const GenericChart = ({ config, labels, markers }: Props) => {
  const { id, datasets, axes, options: customOptions } = config;
  const isMobile = useIsMobile();
  const router = useRouter();
  const chartLegends = useUserPreference("chartLegends");
  const { update: updatePreferences } = useUpdateUserPreferences();
  const { resolve: resolveColor } = useCanvasColors();

  // Chart.js only reads the plugins it was created with, so the markers are handed to the plugin
  const chartRef = useRef<Chart<MixedChartMode> | null>(null);
  const [markerController] = useState(createChartMarkerPlugin);
  const markerColor = resolveColor("var(--primary)");
  const selectMarker = useCallback((marker: ChartMarker) => router.push(marker.href), [router]);
  useEffect(() => {
    markerController.setConfig({ markers: markers ?? [], color: markerColor, onSelect: selectMarker });
    chartRef.current?.draw();
  }, [markerController, markers, markerColor, selectMarker]);

  const isXAxisLinear = customOptions?.scales?.x?.type === "linear";
  const isNumericLabels = labels.length > 0 && typeof labels[0] === "number";

  const chartDatasets = useMemo(() => {
    return datasets.map(dataset => {
      let transformedData: (number | null)[] | ({ x: number; y: number } | null)[] = dataset.data;

      if (isXAxisLinear && isNumericLabels && Array.isArray(dataset.data) && dataset.data.length > 0) {
        const firstItem = dataset.data[0];
        if (firstItem !== null && typeof firstItem === "object" && "x" in firstItem && "y" in firstItem) {
          transformedData = dataset.data as ({ x: number; y: number } | null)[];
        } else {
          transformedData = (dataset.data as (number | null)[]).map((y, index) => {
            if (y === null) {
              return null;
            }
            return { x: labels[index] as number, y };
          });
        }
      }

      const baseConfig = {
        label: dataset.label,
        data: transformedData,
        borderColor: resolveColor(dataset.color),
        backgroundColor:
          dataset.type === "bar" || dataset.type === "point" ? resolveColor(dataset.color) : undefined,
        fill: false,
        lineTension: 0.4,
        spanGaps: true,
        yAxisID: dataset.axisId,
        hidden:
          id && dataset.label
            ? !(chartLegends[id]?.[dataset.label] ?? dataset.showLegend ?? true)
            : !dataset.showLegend,
        stack: dataset.stack,
        order: dataset.stackOrder,
        maxBarThickness: 12,
        pointRadius: dataset.pointRadius ?? (dataset.type === "point" ? 3 : 0),
        showLine: dataset.type !== "point",
        segment: {
          borderDash: (ctx: ScriptableLineSegmentContext) => {
            return ctx.p0.skip || ctx.p1.skip ? [5, 5] : [];
          },
        },
      };

      if (dataset.type === "bar") {
        return { ...baseConfig, type: "bar" as const };
      }

      return { ...baseConfig, type: "line" as const };
    });
  }, [datasets, chartLegends, id, labels, isXAxisLinear, isNumericLabels, resolveColor]);

  const chartAxes = useMemo(() => {
    const generatedAxes: LineScales = {
      x: isXAxisLinear
        ? {
            type: "linear",
            grid: { color: CHART_THEME.gridColor },
            ticks: axes.x?.valueFormatter
              ? { callback: (value: number | string) => axes.x!.valueFormatter!(Number(value)) }
              : undefined,
          }
        : {
            grid: { color: CHART_THEME.gridColor },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              // First arg is tick.value (category index), second is position in ticks array. Use value for labels[].
              callback: (tickValue: number | string) => {
                const labelIndex = Number(tickValue);
                if (typeof labels[labelIndex] === "string") {
                  return labels[labelIndex];
                }
                if (typeof labels[labelIndex] === "number") {
                  return labels[labelIndex].toString();
                }

                const date =
                  labels[labelIndex] instanceof Date ? labels[labelIndex] : parseDate(labels[labelIndex]);
                if (!date) {
                  return "";
                }
                const daysAgo = getDaysAgo(date);
                const currentYear = new Date().getUTCFullYear();
                const dateYear = date.getUTCFullYear();

                if (labels.length > 30) {
                  return dateYear === currentYear
                    ? dayjs(date).utc().format("D MMM")
                    : formatDate(date, "DD MMMM YYYY");
                }

                if (daysAgo === 0) {
                  return "Now";
                }
                if (daysAgo === 1) {
                  return "Yesterday";
                }
                return `${daysAgo}d ago`;
              },
            },
          },
    };

    Object.entries(axes).forEach(([axisId, axis]) => {
      const previousAxis = generatedAxes[axisId];
      // Do not replace x-axis tick formatting from the block above: category labels (and linear x
      // with valueFormatter) must keep their callbacks; otherwise ticks show raw indices / numbers.
      const preserveXTicks = axisId === "x" && previousAxis?.ticks !== undefined;

      generatedAxes[axisId] = {
        position: axis.position,
        reverse: axis.reverse,
        display: axis.hideOnMobile && isMobile ? false : axis.display,
        grid: { drawOnChartArea: axisId === "y", color: axisId === "y" ? CHART_THEME.gridColor : "" },
        title: chartTitle(axis.displayName),
        ticks: preserveXTicks
          ? previousAxis.ticks
          : {
              callback: (value: number | string) => {
                const formattedValue = Number(Number(value).toFixed(4));
                return axis.valueFormatter?.(formattedValue) ?? formattedValue.toString();
              },
            },
        min: axis.min,
        max: axis.max,
      };
    });

    return generatedAxes;
  }, [axes, isMobile, labels, isXAxisLinear]);

  const formattedLabels = useMemo(() => {
    if (isXAxisLinear && isNumericLabels) {
      return labels.map(value => (typeof value === "number" ? value.toString() : value));
    }

    // Same for every label, so work them out once instead of per label
    const todayLabel = formatDateMinimal(getDaysAgoDate(0));
    const yesterdayLabel = formatDateMinimal(getDaysAgoDate(1));

    return labels.map(value => {
      if (typeof value === "string") {
        return value;
      }
      if (typeof value === "number") {
        return value.toString();
      }
      const formattedDate = formatChartDate(value);
      if (formattedDate === todayLabel) {
        return "Now";
      }
      if (formattedDate === yesterdayLabel) {
        return "Yesterday";
      }
      return formattedDate;
    });
  }, [labels, isXAxisLinear, isNumericLabels]);

  const chartOptions = useMemo(() => {
    const mergedScales: LineScales = { ...chartAxes };
    const customScales = (customOptions as LineChartOptions | undefined)?.scales;
    if (customScales) {
      Object.keys(customScales).forEach(axisId => {
        const existingAxis = mergedScales[axisId];
        const customAxis = customScales[axisId];
        mergedScales[axisId] = {
          ...existingAxis,
          ...customAxis,
          ticks:
            existingAxis?.ticks && customAxis?.ticks
              ? { ...existingAxis.ticks, ...customAxis.ticks }
              : customAxis?.ticks || existingAxis?.ticks,
          title:
            existingAxis?.title && customAxis?.title
              ? { ...existingAxis.title, ...customAxis.title }
              : customAxis?.title || existingAxis?.title,
        } as LineScales[string];
      });
    }

    return {
      maintainAspectRatio: false,
      responsive: true,
      resizeDelay: 150,
      interaction: { mode: "index" as const, intersect: false },
      scales: mergedScales,
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          radius: (ctx: ScriptableContext<MixedChartMode>) => {
            if (labels.length > 90) {
              return 0;
            }
            const dataset = ctx.chart?.data?.datasets?.[ctx.datasetIndex];
            if (!dataset) {
              return 3;
            }
            // Point datasets carry a pointRadius that chart.js's dataset typings don't declare
            const datasetType: string | undefined = dataset.type;
            const pointRadius =
              "pointRadius" in dataset && typeof dataset.pointRadius === "number"
                ? dataset.pointRadius
                : undefined;
            return datasetType === "point" ? pointRadius || 3 : 3;
          },
          hoverRadius: (ctx: ScriptableContext<MixedChartMode>) => {
            if (labels.length > 365) {
              return 0;
            }
            if (labels.length > 90) {
              return 2;
            }
            const dataset = ctx.chart?.data?.datasets?.[ctx.datasetIndex];
            if (!dataset) {
              return 4;
            }
            const datasetType: string | undefined = dataset.type;
            const pointRadius =
              "pointRadius" in dataset && typeof dataset.pointRadius === "number"
                ? dataset.pointRadius
                : undefined;
            return datasetType === "point" ? (pointRadius || 3) + 2 : 4;
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          onClick: (_: ChartEvent, legendItem: LegendItem, legend: LegendElement<MixedChartMode>) => {
            const index = legendItem.datasetIndex;
            if (index === undefined) {
              return;
            }
            const chart = legend.chart;
            const willBeVisible = !chart.isDatasetVisible(index);
            chart[willBeVisible ? "show" : "hide"](index);
            if (id) {
              updatePreferences({
                chartLegends: {
                  ...chartLegends,
                  [id]: { ...chartLegends[id], [legendItem.text]: willBeVisible },
                },
              });
            }
          },
        },
        tooltip: {
          callbacks: {
            title: (context: TooltipItem<MixedChartMode>[]) => {
              if (isXAxisLinear && isNumericLabels) {
                const xValue = Number(context[0].parsed.x);
                return axes.x?.valueFormatter?.(xValue) ?? `${xValue.toFixed(1)}%`;
              }

              const value = labels[context[0].dataIndex];
              if (typeof value === "string") {
                return value;
              }
              if (typeof value === "number") {
                return axes.x?.valueFormatter?.(value) ?? value.toString();
              }

              const date = value instanceof Date ? value : parseDate(value);
              if (!date) {
                return "";
              }
              const differenceInDays = getDaysAgo(date);
              const formattedDate = formatDate(date, "dddd, DD MMM, YYYY");

              if (differenceInDays === 0) {
                return `${formattedDate} (Now)`;
              }
              if (differenceInDays === 1) {
                return `${formattedDate} (Yesterday)`;
              }

              const maxUnits = differenceInDays <= 30 ? 1 : differenceInDays < 395 ? 2 : 3;
              return `${formattedDate} (${timeAgo(date, maxUnits)})`;
            },
            label: (context: TooltipItem<MixedChartMode>) => {
              const value = Number(context.parsed.y);
              const datasetConfig = datasets[context.datasetIndex];
              if (datasetConfig.labelFormatter) {
                return datasetConfig.labelFormatter(value);
              }
              const chartDataset = context.chart.data.datasets[context.datasetIndex];
              return `${chartDataset.label || datasetConfig.label}: ${value.toFixed(2)}`;
            },
          },
        },
      },
      ...Object.fromEntries(Object.entries(customOptions || {}).filter(([key]) => key !== "scales")),
    };
  }, [
    chartAxes,
    labels,
    datasets,
    updatePreferences,
    id,
    customOptions,
    isXAxisLinear,
    isNumericLabels,
    axes,
  ]);

  const showNoData = !datasets.some(dataset => dataset.data.some(value => value !== null));

  if (showNoData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
        <SharedIcons.NoChartDataIcon className="text-muted-foreground/60 size-8" />
        <p className="text-muted-foreground text-sm">No data for this period yet</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full">
      <div className="relative block h-full w-full">
        <ChartComponent<MixedChartMode>
          ref={chartRef}
          type="line"
          plugins={[markerController.plugin]}
          className="h-full max-w-full"
          options={chartOptions}
          data={{ labels: formattedLabels, datasets: chartDatasets }}
        />
      </div>
    </div>
  );
};

export default GenericChart;
