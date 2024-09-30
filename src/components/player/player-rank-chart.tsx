/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { formatNumberWithCommas } from "@/common/number-utils";
import {
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
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { getDaysAgo, parseDate } from "@/common/time-utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

Chart.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type AxisPosition = "left" | "right";

/**
 * A ChartJS axis
 */
type Axis = {
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

/**
 * A ChartJS dataset
 */
type Dataset = {
  label: string;
  data: (number | null)[]; // Allow null values for gaps
  borderColor: string;
  fill: boolean;
  lineTension: number;
  spanGaps: boolean;
  yAxisID: string;
};

/**
 * Generate an axis
 *
 * @param id the id of the axis
 * @param reverse if the axis should be reversed
 * @param display if the axis should be displayed
 * @param position the position of the axis
 * @param displayName the optional name to display for the axis
 */
const generateAxis = (
  id: string,
  reverse: boolean,
  display: boolean,
  position: AxisPosition,
  displayName: string,
): Axis => ({
  id,
  position,
  display,
  grid: {
    drawOnChartArea: id === "y",
    color: id === "y" ? "#252525" : "",
  },
  title: {
    display: true,
    text: displayName,
    color: "#ffffff",
  },
  ticks: {
    stepSize: 10,
  },
  reverse,
});

/**
 * Generate a dataset
 *
 * @param label the label of the dataset
 * @param data the data of the dataset
 * @param borderColor the border color of the dataset
 * @param yAxisID the ID of the y-axis
 */
const generateDataset = (
  label: string,
  data: (number | null)[],
  borderColor: string,
  yAxisID: string,
): Dataset => ({
  label,
  data,
  borderColor,
  fill: false,
  lineTension: 0.5,
  spanGaps: false, // Set to false to allow gaps
  yAxisID,
});

type DatasetConfig = {
  title: string;
  field: string;
  color: string;
  axisId: string;
  axisConfig: {
    reverse: boolean;
    display: boolean;
    displayName: string;
    position: AxisPosition;
  };
  labelFormatter: (value: number) => string;
};

// Configuration array for datasets and axes with label formatters
const datasetConfig: DatasetConfig[] = [
  {
    title: "Rank",
    field: "rank",
    color: "#3EC1D3",
    axisId: "y",
    axisConfig: {
      reverse: true,
      display: true,
      displayName: "Global Rank",
      position: "left",
    },
    labelFormatter: (value: number) => `Rank #${formatNumberWithCommas(value)}`,
  },
  {
    title: "Country Rank",
    field: "countryRank",
    color: "#FFEA00",
    axisId: "y1",
    axisConfig: {
      reverse: true,
      display: false,
      displayName: "Country Rank",
      position: "left",
    },
    labelFormatter: (value: number) =>
      `Country Rank #${formatNumberWithCommas(value)}`,
  },
  {
    title: "PP",
    field: "pp",
    color: "#606fff",
    axisId: "y2",
    axisConfig: {
      reverse: false,
      display: true,
      displayName: "PP",
      position: "right",
    },
    labelFormatter: (value: number) => `PP ${formatNumberWithCommas(value)}pp`,
  },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerRankChart({ player }: Props) {
  const isMobile = useIsMobile();

  if (
    !player.statisticHistory ||
    Object.keys(player.statisticHistory).length === 0
  ) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }

  const labels: string[] = [];
  const histories: Record<string, (number | null)[]> = {
    rank: [],
    countryRank: [],
    pp: [],
  };

  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime(),
  );

  let previousDate: Date | null = null;

  // Create labels and history data
  for (const [dateString, history] of statisticEntries) {
    const currentDate = parseDate(dateString);

    // Insert nulls for missing days
    if (previousDate) {
      const diffDays = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      for (let i = 1; i < diffDays; i++) {
        labels.push(
          `${getDaysAgo(
            new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000),
          )} days ago`,
        );
        datasetConfig.forEach((config) => {
          histories[config.field].push(null);
        });
      }
    }

    const daysAgo = getDaysAgo(currentDate);
    labels.push(daysAgo === 0 ? "Today" : `${daysAgo} days ago`);

    // stupid typescript crying wahh wahh wahh - https://youtu.be/hBEKgHDzm_s?si=ekOdMMdb-lFnA1Yz&t=11
    datasetConfig.forEach((config) => {
      (histories as any)[config.field].push(
        (history as any)[config.field] ?? null,
      );
    });

    previousDate = currentDate;
  }

  // Dynamically create axes and datasets based on datasetConfig
  const axes: Record<string, Axis> = {
    x: {
      grid: {
        color: "#252525", // gray grid lines
      },
      reverse: false,
    },
  };

  const datasets: Dataset[] = datasetConfig
    .map((config) => {
      if (histories[config.field].some((value) => value !== null)) {
        axes[config.axisId] = generateAxis(
          config.axisId,
          config.axisConfig.reverse,
          isMobile ? false : config.axisConfig.display,
          config.axisConfig.position,
          config.axisConfig.displayName,
        );
        return generateDataset(
          config.title,
          histories[config.field],
          config.color,
          config.axisId,
        );
      }
      return null;
    })
    .filter(Boolean) as Dataset[];

  const options: any = {
    maintainAspectRatio: false,
    aspectRatio: 1,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: axes,
    elements: {
      point: {
        radius: 0,
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "white",
        },
      },
      tooltip: {
        callbacks: {
          label(context: any) {
            const value = Number(context.parsed.y);
            const config = datasetConfig.find(
              (cfg) => cfg.title === context.dataset.label,
            );
            return config?.labelFormatter(value) ?? "";
          },
        },
      },
    },
  };

  const data = {
    labels,
    datasets,
  };

  return (
    <div className="h-96">
      <Line className="w-fit" options={options} data={data} />
    </div>
  );
}
