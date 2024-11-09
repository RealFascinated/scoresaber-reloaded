/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Chart, registerables } from "chart.js";
import { Line } from "react-chartjs-2";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDateMinimal, getDaysAgo, getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";
import { Axis, Dataset, DatasetConfig } from "@/common/chart/types";
import { generateChartAxis, generateChartDataset } from "@/common/chart/chart.util";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

Chart.register(...registerables);

export type ChartProps = {
  options?: {
    id: string;
  };
  labels: Date[] | string[];
  datasetConfig: DatasetConfig[];
  histories: Record<string, (number | null)[]>;
};

export default function GenericChart({ options, labels, datasetConfig, histories }: ChartProps) {
  const id = options?.id;
  const isMobile = useIsMobile();
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());

  const axes: Record<string, Axis> = {
    x: {
      grid: { color: "#252525" },
      reverse: false,
      ticks: {
        font: (context: any) => {
          if (parseDate(context.tick.label).getDate() === 1) {
            return {
              weight: "bold",
            };
          }
        },
        color: (context: any) => {
          if (parseDate(context.tick.label).getDate() === 1) {
            return "#ffffff";
          }
          return "#717171";
        },
      },
    },
  };

  const datasets: Dataset[] = datasetConfig
    .map(config => {
      const historyArray = histories[config.field];

      if (historyArray && historyArray.some(value => value !== null)) {
        axes[config.axisId] = generateChartAxis(
          config.axisId,
          config.axisConfig.reverse,
          isMobile && config.axisConfig.hideOnMobile ? false : config.axisConfig.display,
          config.axisConfig.position,
          config.axisConfig.displayName,
          config.axisConfig.valueFormatter
        );

        return generateChartDataset(
          config.title,
          historyArray,
          config.color,
          config.axisId,
          settings?.getChartLegend(id!, config.title, true),
          config.type || "line"
        );
      }

      return null;
    })
    .filter(Boolean) as Dataset[];

  const chartOptions: any = {
    maintainAspectRatio: false,
    responsive: true,
    interaction: { mode: "index", intersect: false },
    scales: axes,
    elements: { point: { radius: 0 } },
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
        // Custom onClick handler for legend item clicks
        onClick: (event: MouseEvent, legendItem: any, legend: any) => {
          const index = legendItem.datasetIndex;
          const chart = legend.chart;
          if (chart.isDatasetVisible(index)) {
            chart.hide(index);
            legendItem.hidden = true;
          } else {
            chart.show(index);
            legendItem.hidden = false;
          }
          id && settings?.setChartLegendState(id, legendItem.text, !legendItem.hidden);
        },
      },
      tooltip: {
        callbacks: {
          title(context: any) {
            const value = labels[context[0].dataIndex];
            if (typeof value === "string") {
              return value;
            }
            const date = value as Date;
            const differenceInDays = getDaysAgo(date);
            let formattedDate: string;
            if (differenceInDays === 0) {
              formattedDate = "Now";
            } else if (differenceInDays === 1) {
              formattedDate = "Yesterday";
            } else {
              formattedDate = formatDateMinimal(date);
            }

            return `${formattedDate} ${differenceInDays > 0 ? `(${differenceInDays} day${differenceInDays > 1 ? "s" : ""} ago)` : ""}`;
          },
          label(context: any) {
            const value = Number(context.parsed.y);
            const config = datasetConfig.find(cfg => cfg.title === context.dataset.label);
            return config?.labelFormatter(value) ?? "";
          },
        },
      },
    },
  };

  const formattedLabels = labels.map(value => {
    if (typeof value === "string") {
      return value;
    }
    const formattedDate = formatDateMinimal(value);
    if (formatDateMinimal(getDaysAgoDate(0)) === formattedDate) {
      return "Now";
    }
    if (formatDateMinimal(getDaysAgoDate(1)) === formattedDate) {
      return "Yesterday";
    }

    return formattedDate;
  });

  const data: any = { labels: formattedLabels, datasets };

  return (
    <div className="block h-[360px] w-full relative">
      <Line
        className="max-w-[100%]"
        options={chartOptions}
        data={data}
        plugins={[
          {
            id: "legend-padding",
            beforeInit: (chart: any) => {
              const originalFit = chart.legend.fit;
              chart.legend.fit = function fit() {
                originalFit.bind(chart.legend)();
                this.height += 2;
              };
            },
          },
        ]}
      />
    </div>
  );
}
