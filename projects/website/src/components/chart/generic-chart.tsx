/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Chart, registerables } from "chart.js";
import { Line } from "react-chartjs-2";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDate, formatDateMinimal, getDaysAgo, getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";
import { Axis, Dataset, DatasetConfig } from "@/common/chart/types";
import { generateChartAxis, generateChartDataset } from "@/common/chart/chart.util";
import useSettings from "@/hooks/use-settings";
import { useMemo } from "react";

Chart.register(...registerables);

export type ChartProps = {
  options?: { id: string };
  labels: Date[] | string[];
  datasetConfig: DatasetConfig[];
  histories: Record<string, (number | null)[]>;
};

const GenericChart = ({ options, labels, datasetConfig, histories }: ChartProps) => {
  const { id } = options || {};
  const isMobile = useIsMobile();
  const settings = useSettings();

  const axes = useMemo(() => {
    const generatedAxes: Record<string, Axis> = { x: { grid: { color: "#252525" }, reverse: false, ticks: {} } };

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
            settings?.getChartLegend(id!, config.title, true),
            config.axisConfig.stack,
            config.axisConfig.stackOrder,
            config.type || "line",
            config.pointRadius
          );
        }
        return null;
      })
      .filter(Boolean) as Dataset[];
  }, [datasetConfig, histories, settings, id]);

  const formattedLabels = useMemo(() => {
    return labels.map(value => {
      if (typeof value === "string") return value;
      const formattedDate = formatDateMinimal(value);
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
            id && settings?.setChartLegendState(id, legendItem.text, !legendItem.hidden);
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
    [axes, labels, datasetConfig, settings, id]
  );

  return (
    <div className="block h-[360px] w-full relative">
      <Line
        className="max-w-[100%]"
        options={chartOptions}
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
  );
};

export default GenericChart;
