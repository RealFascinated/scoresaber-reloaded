"use client";

import { ChartConfig } from "@/common/chart/types";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  formatChartDate,
  formatDate,
  formatDateMinimal,
  getDaysAgo,
  getDaysAgoDate,
  parseDate,
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
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

// Register only the required components
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

// Extend Chart.js types to support mixed chart types
declare module "chart.js" {
  interface ChartTypeRegistry {
    mixed: {
      chartOptions: any;
      datasetOptions: any;
      defaultDataPoint: number | null;
    };
  }
}

type Props = {
  config: ChartConfig;
  labels: Date[] | string[];
};

const GenericChart = ({ config, labels }: Props) => {
  const { id, datasets, axes, options: customOptions } = config;
  const isMobile = useIsMobile();
  const database = useDatabase();

  const chartDatasets = useMemo(() => {
    return datasets.map(dataset => {
      const baseConfig = {
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color,
        backgroundColor:
          dataset.type === "bar" || dataset.type === "point" ? dataset.color : undefined,
        fill: false,
        lineTension: 0.4,
        spanGaps: true,
        yAxisID: dataset.axisId,
        hidden:
          id && dataset.label
            ? !database.getChartLegend(id, dataset.label, true)
            : !dataset.showLegend,
        stack: dataset.stack,
        order: dataset.stackOrder,
        maxBarThickness: 12,
        pointRadius: dataset.type === "point" ? dataset.pointRadius || 3 : 0,
        showLine: dataset.type !== "point",
      };

      // Add type-specific configuration
      if (dataset.type === "bar") {
        return {
          ...baseConfig,
          type: "bar" as const,
        };
      }

      return {
        ...baseConfig,
        type: "line" as const,
      };
    });
  }, [datasets, database, id]);

  const chartAxes = useMemo(() => {
    const generatedAxes: Record<string, any> = {
      x: {
        grid: { color: "#252525" },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: (context: any) => {
            // For ranges less than 3 months, show all days
            if (labels.length <= 90) {
              return labels.length;
            }
            // For larger ranges, limit to 10 ticks
            return 10;
          },
          callback: (value: any, index: number) => {
            if (typeof labels[index] === "string") return value;
            const date = labels[index] instanceof Date ? labels[index] : parseDate(labels[index]);
            const daysAgo = getDaysAgo(date);

            // For large date ranges, show month and year
            if (labels.length > 90) {
              const currentYear = new Date().getUTCFullYear();
              const dateYear = date.getUTCFullYear();
              return dateYear === currentYear
                ? date.toLocaleString("en-US", { timeZone: "Europe/London", month: "long" })
                : formatDate(date, "MMMM YYYY");
            }

            // For medium date ranges, show day and month
            if (labels.length > 30) {
              const currentYear = new Date().getUTCFullYear();
              const dateYear = date.getUTCFullYear();
              return dateYear === currentYear
                ? date.toLocaleString("en-US", {
                    timeZone: "Europe/London",
                    day: "numeric",
                    month: "long",
                  })
                : formatDate(date, "DD MMMM YYYY");
            }

            // For small date ranges, show relative dates
            if (daysAgo === 0) return "Now";
            if (daysAgo === 1) return "Yesterday";
            return `${daysAgo}d ago`;
          },
        },
      },
    };

    Object.entries(axes).forEach(([axisId, axis]) => {
      if (!axis.hideOnMobile || !isMobile) {
        generatedAxes[axisId] = {
          position: axis.position,
          reverse: axis.reverse,
          display: axis.display,
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
      }
    });

    return generatedAxes;
  }, [axes, isMobile, labels]);

  const formattedLabels = useMemo(() => {
    return labels.map(value => {
      if (typeof value === "string") return value;
      const formattedDate = formatChartDate(value);
      if (formattedDate === formatDateMinimal(getDaysAgoDate(0))) return "Now";
      if (formattedDate === formatDateMinimal(getDaysAgoDate(1))) return "Yesterday";
      return formattedDate;
    });
  }, [labels]);

  const chartOptions = useMemo(
    () => ({
      animation: { duration: 0 },
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: "index" as const, intersect: false },
      scales: chartAxes,
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          radius: (ctx: any) => {
            const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
            return labels.length > 90 ? 0 : dataset.type === "point" ? dataset.pointRadius || 3 : 3;
          },
          hoverRadius: (ctx: any) => {
            const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
            return dataset.type === "point" ? (dataset.pointRadius || 3) + 2 : 4;
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: "white",
            padding: 20,
            filter: (legendItem: any, chartData: any) => {
              const dataset = chartData.datasets[legendItem.datasetIndex];
              return dataset.showLegend !== false;
            },
          },
          onClick: (event: any, legendItem: any, legend: any) => {
            const index = legendItem.datasetIndex;
            const chart = legend.chart;
            chart[chart.isDatasetVisible(index) ? "hide" : "show"](index);
            legendItem.hidden = !legendItem.hidden;
            id && database.setChartLegend(id, legendItem.text, !legendItem.hidden);
          },
        },
        tooltip: {
          callbacks: {
            title: (context: any) => {
              const value = labels[context[0].dataIndex];
              if (typeof value === "string") return value;

              const date = value instanceof Date ? value : parseDate(value);
              const differenceInDays = getDaysAgo(date);
              const formattedDate = formatDate(date, "dddd, DD MMM, YYYY");
              if (differenceInDays === 0) return `${formattedDate} (Now)`;
              if (differenceInDays === 1) return `${formattedDate} (Yesterday)`;
              return `${formattedDate} (${differenceInDays} day${differenceInDays > 1 ? "s" : ""} ago)`;
            },
            label: (context: any) => {
              const value = Number(context.parsed.y);
              const dataset = datasets[context.datasetIndex];
              return dataset.labelFormatter?.(value) ?? "";
            },
          },
        },
      },
      ...customOptions,
    }),
    [chartAxes, labels, datasets, database, id, customOptions]
  );

  // Check if any dataset has data
  const showNoData = useMemo(() => {
    return !datasets.some(dataset => dataset.data.some(value => value !== null));
  }, [datasets]);

  return (
    <div className="flex relative h-[360px] w-full">
      {showNoData ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-9999 bg-muted p-2 rounded-md">
          <p className="text-red-500">No data available :(</p>
        </div>
      ) : null}
      <div className="block h-[360px] w-full relative">
        <Line
          className="max-w-[100%]"
          options={chartOptions}
          data={{ labels: formattedLabels, datasets: chartDatasets as any }}
        />
      </div>
    </div>
  );
};

export default GenericChart;
