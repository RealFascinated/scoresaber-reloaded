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
          config.axisConfig.valueFormatter
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
      scales: axes,
      elements: {
        point: {
          radius: 0,
          hoverRadius: (ctx: any) => {
            const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
            return dataset.type === "point" ? (dataset.pointRadius || 3) + 2 : 4;
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "white",
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
