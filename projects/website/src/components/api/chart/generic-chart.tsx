"use client";

import { ChartConfig } from "@/common/chart/types";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
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
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

dayjs.extend(utc);

Chart.register(
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  BarController
);

type Props = {
  config: ChartConfig;
  labels: Date[] | string[] | number[];
};

const GenericChart = ({ config, labels }: Props) => {
  const { id, datasets, axes, options: customOptions } = config;
  const isMobile = useIsMobile();
  const database = useDatabase();

  const isXAxisLinear = customOptions?.scales?.x?.type === "linear";
  const isNumericLabels = labels.length > 0 && typeof labels[0] === "number";

  const chartDatasets = useMemo(() => {
    return datasets.map(dataset => {
      let transformedData: (number | null)[] | ({ x: number; y: number } | null)[] = dataset.data;

      if (
        isXAxisLinear &&
        isNumericLabels &&
        Array.isArray(dataset.data) &&
        dataset.data.length > 0
      ) {
        const firstItem = dataset.data[0];
        if (
          firstItem !== null &&
          typeof firstItem === "object" &&
          "x" in firstItem &&
          "y" in firstItem
        ) {
          transformedData = dataset.data as ({ x: number; y: number } | null)[];
        } else {
          transformedData = (dataset.data as (number | null)[]).map((y, index) => {
            if (y === null) return null;
            return { x: labels[index] as number, y };
          });
        }
      }

      const baseConfig = {
        label: dataset.label,
        data: transformedData,
        borderColor: dataset.color,
        backgroundColor:
          dataset.type === "bar" || dataset.type === "point" ? dataset.color : undefined,
        fill: false,
        lineTension: 0.4,
        spanGaps: true,
        yAxisID: dataset.axisId,
        hidden:
          id && dataset.label
            ? !database.getChartLegend(id, dataset.label, dataset.showLegend ?? true)
            : !dataset.showLegend,
        stack: dataset.stack,
        order: dataset.stackOrder,
        maxBarThickness: 12,
        pointRadius: dataset.type === "point" ? dataset.pointRadius || 3 : 0,
        showLine: dataset.type !== "point",
        segment: {
          borderDash: (ctx: any) => {
            return ctx.p0.skip || ctx.p1.skip ? [5, 5] : [];
          },
        },
      };

      if (dataset.type === "bar") {
        return { ...baseConfig, type: "bar" as const };
      }

      return { ...baseConfig, type: "line" as const };
    });
  }, [datasets, database, id, labels, isXAxisLinear, isNumericLabels]);

  const chartAxes = useMemo(() => {
    const generatedAxes: Record<string, any> = {
      x: isXAxisLinear
        ? {
            type: "linear",
            grid: { color: "#252525" },
            ticks: axes.x?.valueFormatter
              ? { callback: (value: number) => axes.x!.valueFormatter!(value) }
              : undefined,
          }
        : {
            grid: { color: "#252525" },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              callback: (_: any, index: number) => {
                if (typeof labels[index] === "string") return labels[index];
                if (typeof labels[index] === "number") return labels[index].toString();

                const date =
                  labels[index] instanceof Date ? labels[index] : parseDate(labels[index]);
                const daysAgo = getDaysAgo(date);
                const currentYear = new Date().getUTCFullYear();
                const dateYear = date.getUTCFullYear();

                if (labels.length > 30) {
                  return dateYear === currentYear
                    ? dayjs(date).utc().format("D MMM")
                    : formatDate(date, "DD MMMM YYYY");
                }

                if (daysAgo === 0) return "Now";
                if (daysAgo === 1) return "Yesterday";
                return `${daysAgo}d ago`;
              },
            },
          },
    };

    Object.entries(axes).forEach(([axisId, axis]) => {
      generatedAxes[axisId] = {
        position: axis.position,
        reverse: axis.reverse,
        display: axis.hideOnMobile && isMobile ? false : axis.display,
        grid: { drawOnChartArea: axisId === "y", color: axisId === "y" ? "#252525" : "" },
        title: { display: true, text: axis.displayName, color: "#ffffff" },
        ticks: {
          callback: (value: number) => {
            // Format the value to avoid excessive decimal places
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

    return labels.map(value => {
      if (typeof value === "string") return value;
      if (typeof value === "number") return value.toString();
      const formattedDate = formatChartDate(value);
      if (formattedDate === formatDateMinimal(getDaysAgoDate(0))) return "Now";
      if (formattedDate === formatDateMinimal(getDaysAgoDate(1))) return "Yesterday";
      return formattedDate;
    });
  }, [labels, isXAxisLinear, isNumericLabels]);

  const chartOptions = useMemo(() => {
    const mergedScales: Record<string, any> = { ...chartAxes };
    const customScales = customOptions?.scales;
    if (customScales) {
      Object.keys(customScales).forEach(axisId => {
        const existingAxis: any = mergedScales[axisId];
        const customAxis: any = (customScales as any)[axisId];
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
        };
      });
    }

    return {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: "index" as const, intersect: false },
      scales: mergedScales,
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          radius: (ctx: any) => {
            if (labels.length > 90) return 0;
            const dataset = ctx.chart?.data?.datasets?.[ctx.datasetIndex];
            if (!dataset) return 3;
            return dataset.type === "point" ? dataset.pointRadius || 3 : 3;
          },
          hoverRadius: (ctx: any) => {
            if (labels.length > 365) return 0;
            if (labels.length > 90) return 2;
            const dataset = ctx.chart?.data?.datasets?.[ctx.datasetIndex];
            if (!dataset) return 4;
            return dataset.type === "point" ? (dataset.pointRadius || 3) + 2 : 4;
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: "white",
            filter: (legendItem: any, chartData: any) => {
              const dataset = chartData.datasets[legendItem.datasetIndex];
              return dataset.showLegend !== false;
            },
          },
          onClick: (_: any, legendItem: any, legend: any) => {
            const index = legendItem.datasetIndex;
            const chart = legend.chart;
            chart[chart.isDatasetVisible(index) ? "hide" : "show"](index);
            legendItem.hidden = !legendItem.hidden;
            if (id) {
              database.setChartLegend(id, legendItem.text, !legendItem.hidden);
            }
          },
        },
        tooltip: {
          callbacks: {
            title: (context: any) => {
              if (isXAxisLinear && isNumericLabels) {
                const xValue = context[0].parsed.x;
                return axes.x?.valueFormatter?.(xValue) ?? `${xValue.toFixed(1)}%`;
              }

              const value = labels[context[0].dataIndex];
              if (typeof value === "string") return value;
              if (typeof value === "number") {
                return axes.x?.valueFormatter?.(value) ?? value.toString();
              }

              const date = value instanceof Date ? value : parseDate(value);
              const differenceInDays = getDaysAgo(date);
              const formattedDate = formatDate(date, "dddd, DD MMM, YYYY");

              if (differenceInDays === 0) return `${formattedDate} (Now)`;
              if (differenceInDays === 1) return `${formattedDate} (Yesterday)`;

              const maxUnits = differenceInDays <= 30 ? 1 : differenceInDays < 395 ? 2 : 3;
              return `${formattedDate} (${timeAgo(date, maxUnits)})`;
            },
            label: (context: any) => {
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
      ...Object.fromEntries(
        Object.entries(customOptions || {}).filter(([key]) => key !== "scales")
      ),
    };
  }, [
    chartAxes,
    labels,
    datasets,
    database,
    id,
    customOptions,
    isXAxisLinear,
    isNumericLabels,
    axes,
  ]);

  const showNoData = !datasets.some(dataset => dataset.data.some(value => value !== null));

  return (
    <div className="relative flex h-full w-full">
      {showNoData && (
        <div className="bg-muted absolute top-1/2 left-1/2 z-9999 -translate-x-1/2 -translate-y-1/2 rounded-md p-2 text-center">
          <p className="text-red-500">No data available :(</p>
        </div>
      )}
      <div className="relative block h-full w-full">
        <Line
          className="h-full max-w-full"
          options={chartOptions}
          data={{ labels: formattedLabels, datasets: chartDatasets as any }}
          plugins={[
            {
              id: "paddingBelowLegends",
              beforeInit(chart: any) {
                const originalFit = chart.legend.fit;
                chart.legend.fit = function fit() {
                  originalFit.bind(chart.legend)();
                  this.height += 8;
                };
              },
            },
          ]}
        />
      </div>
    </div>
  );
};

export default GenericChart;
