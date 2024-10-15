/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDateMinimal, getDaysAgo, getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";

Chart.register(LinearScale, CategoryScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export type AxisPosition = "left" | "right";
export type DatasetDisplayType = "line" | "bar";

export type Axis = {
  id?: string;
  position?: AxisPosition;
  display?: boolean;
  grid?: { color?: string; drawOnChartArea?: boolean };
  title?: { display: boolean; text: string; color?: string };
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
    displayName: string;
    position: AxisPosition;
    valueFormatter?: (value: number) => string; // Added precision option here
  };
  type?: DatasetDisplayType;
  labelFormatter: (value: number) => string;
};

export type ChartProps = {
  labels: Date[];
  datasetConfig: DatasetConfig[];
  histories: Record<string, (number | null)[]>;
};

const generateAxis = (
  id: string,
  reverse: boolean,
  display: boolean,
  position: AxisPosition,
  displayName: string,
  valueFormatter?: (value: number) => string
): Axis => ({
  id,
  position,
  display,
  grid: { drawOnChartArea: id === "y", color: id === "y" ? "#252525" : "" },
  title: { display: true, text: displayName, color: "#ffffff" },
  ticks: {
    stepSize: 10,
    callback: (value: number) => {
      // Apply precision if specified, otherwise default to no decimal places
      return valueFormatter !== undefined ? valueFormatter(value) : value.toString();
    },
  },
  reverse,
});

const generateDataset = (
  label: string,
  data: (number | null)[],
  borderColor: string,
  yAxisID: string,
  type?: DatasetDisplayType
): Dataset => ({
  label,
  data,
  borderColor,
  fill: false,
  lineTension: 0.5,
  spanGaps: false,
  yAxisID,
  type,
  ...(type === "bar" && {
    backgroundColor: borderColor,
  }),
});

export default function GenericChart({ labels, datasetConfig, histories }: ChartProps) {
  const isMobile = useIsMobile();

  const axes: Record<string, Axis> = {
    x: {
      grid: { color: "#252525" },
      reverse: false,
      ticks: {
        font: (context: any) => {
          // Make the first of the month bold
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
        axes[config.axisId] = generateAxis(
          config.axisId,
          config.axisConfig.reverse,
          isMobile && config.axisConfig.hideOnMobile ? false : config.axisConfig.display,
          config.axisConfig.position,
          config.axisConfig.displayName,
          config.axisConfig.valueFormatter
        );

        return generateDataset(config.title, historyArray, config.color, config.axisId, config.type || "line");
      }

      return null;
    })
    .filter(Boolean) as Dataset[];

  const options: any = {
    maintainAspectRatio: false,
    responsive: true,
    interaction: { mode: "index", intersect: false },
    scales: axes,
    elements: { point: { radius: 0 } },
    plugins: {
      legend: { position: "top", labels: { color: "white" } },
      tooltip: {
        callbacks: {
          title(context: any) {
            const date = labels[context[0].dataIndex];
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

  const formattedLabels = labels.map(date => {
    const formattedDate = formatDateMinimal(date);
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
        options={options}
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
