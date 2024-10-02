"use client";

import { CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { useIsMobile } from "@/hooks/use-is-mobile";

Chart.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Tooltip, Legend);

export type AxisPosition = "left" | "right";

export type Axis = {
  id?: string;
  position?: AxisPosition;
  display?: boolean;
  grid?: { color?: string; drawOnChartArea?: boolean };
  title?: { display: boolean; text: string; color?: string };
  ticks?: {
    stepSize?: number;
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
  };
  labelFormatter: (value: number) => string;
};

export type ChartProps = {
  labels: string[];
  datasetConfig: DatasetConfig[];
  histories: Record<string, (number | null)[]>;
};

const generateAxis = (
  id: string,
  reverse: boolean,
  display: boolean,
  position: AxisPosition,
  displayName: string
): Axis => ({
  id,
  position,
  display,
  grid: { drawOnChartArea: id === "y", color: id === "y" ? "#252525" : "" },
  title: { display: true, text: displayName, color: "#ffffff" },
  ticks: { stepSize: 10 },
  reverse,
});

const generateDataset = (label: string, data: (number | null)[], borderColor: string, yAxisID: string): Dataset => ({
  label,
  data,
  borderColor,
  fill: false,
  lineTension: 0.5,
  spanGaps: false,
  yAxisID,
});

export default function GenericChart({ labels, datasetConfig, histories }: ChartProps) {
  const isMobile = useIsMobile();

  const axes: Record<string, Axis> = {
    x: {
      grid: { color: "#252525" },
      reverse: false,
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
          config.axisConfig.displayName
        );

        return generateDataset(config.title, historyArray, config.color, config.axisId);
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
          label(context: any) {
            const value = Number(context.parsed.y);
            const config = datasetConfig.find(cfg => cfg.title === context.dataset.label);
            return config?.labelFormatter(value) ?? "";
          },
        },
      },
    },
  };

  const data = { labels, datasets };

  return (
    <div className="block h-[320px] w-full relative">
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
