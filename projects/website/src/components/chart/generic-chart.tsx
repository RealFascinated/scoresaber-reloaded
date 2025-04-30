/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { generateChartAxis, generateChartDataset } from "@/common/chart/chart.util";
import { Axis, Dataset, DatasetConfig } from "@/common/chart/types";
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

export type ChartProps = {
  options?: { id: string; plugins?: any };
  labels: Date[] | string[];
  datasetConfig: DatasetConfig[];
  histories: Record<string, (number | null)[]>;
};

const GenericChart = ({ options, labels, datasetConfig, histories }: ChartProps) => {
  const { id } = options || {};
  const isMobile = useIsMobile();
  const database = useDatabase();

  const axes = useMemo(() => {
    const generatedAxes: Record<string, Axis> = {
      x: { grid: { color: "#252525" }, reverse: false, ticks: {} },
    };

    datasetConfig.forEach(config => {
      const historyArray = histories[config.field];
      if (historyArray?.some(value => value !== null)) {
        generatedAxes[config.axisId] = generateChartAxis(
          config.axisId,
          config.axisConfig.reverse,
          isMobile && config.axisConfig.hideOnMobile ? false : config.axisConfig.display,
          config.axisConfig.position,
          config.axisConfig.displayName,
          (value: number) => {
            // First apply the custom formatter if it exists
            const customFormatted = config.axisConfig.valueFormatter?.(value);
            if (customFormatted !== undefined) return customFormatted;
            
            // Otherwise round to 2 decimal places and convert to string
            return value.toFixed(2);
          }
        );
      }
    });

    return generatedAxes;
  }, [datasetConfig, histories, isMobile]);

  const datasets = useMemo(() => {
    return datasetConfig
      .map(config => {
        const historyArray = histories[config.field];

        if (historyArray?.some(value => value !== null)) {
          return generateChartDataset(
            config.title,
            historyArray,
            config.color,
            config.axisId,
            database.getChartLegend(id!, config.title, true),
            config.axisConfig.stack,
            config.axisConfig.stackOrder,
            config.type || "line",
            config.pointRadius
          );
        }
        return null;
      })
      .filter(Boolean) as Dataset | null[];
  }, [datasetConfig, histories, database, id]);

  const formattedLabels = useMemo(() => {
    return labels.map(value => {
      if (typeof value === "string") return value;
      const formattedDate = formatChartDate(value);
      if (formattedDate === formatDateMinimal(getDaysAgoDate(0))) return "Now";
      if (formattedDate === formatDateMinimal(getDaysAgoDate(1))) return "Yesterday";
      return formattedDate;
    });
  }, [labels]);

  const chartOptions: any = useMemo(
    () => ({
      animation: { duration: 0 },
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        ...axes,
        x: {
          ...axes.x,
          ticks: {
            ...axes.x.ticks,
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
                return formatDate(date, "MMMM YYYY");
              }
              
              // For medium date ranges, show day and month
              if (labels.length > 30) {
                return formatDate(date, "DD MMMM YYYY");
              }
              
              // For small date ranges, show relative dates
              if (daysAgo === 0) return "Now";
              if (daysAgo === 1) return "Yesterday";
              return `${daysAgo}d ago`;
            }
          }
        }
      },
      elements: {
        point: {
          radius: (ctx: any) => {
            const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
            // For large date ranges, only show points on hover
            return labels.length > 90 ? 0 : (dataset.type === "point" ? dataset.pointRadius || 3 : 3);
          },
          hoverRadius: (ctx: any) => {
            const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
            return dataset.type === "point" ? (dataset.pointRadius || 3) + 2 : 4;
          },
        },
        line: {
          tension: 0.4, // Add slight curve to lines for better appearance
        }
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "white",
            padding: 20, // Add more padding between legend items
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
              const config = datasetConfig.find(cfg => cfg.title === context.dataset.label);
              return config?.labelFormatter(value) ?? "";
            },
          },
        },
      },
    }),
    [axes, labels, datasetConfig, database, id]
  );

  // Memoize the no data checker logic
  const showNoData = useMemo(() => {
    if (datasetConfig.length === 1) {
      for (const dataset of datasetConfig) {
        const containsData = histories[dataset.field].some(value => value !== null);
        if (!containsData) {
          return true;
        }
      }
    }
    return false;
  }, [datasetConfig, histories]);

  const chartStyle = useMemo(() => {
    // If there's only one dataset and it has no display name, apply negative margin
    if (datasetConfig.length === 1 && !datasetConfig[0].axisConfig.displayName) {
      return { marginLeft: "-10px" };
    }
    return {};
  }, [datasetConfig]);

  // Render the chart with collected data
  return (
    <div className="flex relative h-[360px] w-full">
      {showNoData ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-9999 bg-muted p-2 rounded-md">
          <p className="text-red-500">No data available :(</p>
        </div>
      ) : null}
      <div className="block h-[360px] w-full relative" style={chartStyle}>
        <Line
          className="max-w-[100%]"
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              ...(options?.plugins || []),
            },
          }}
          data={{ labels: formattedLabels, datasets: datasets as any }}
          plugins={[
            {
              id: "legend-padding",
              beforeInit: (chart: any) => {
                const originalFit = chart.legend.fit;
                chart.legend.fit = function () {
                  originalFit.bind(chart.legend)();
                  this.height += 2;
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
